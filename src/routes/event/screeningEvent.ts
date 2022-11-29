/**
 * イベントルーター
 */
import { chevre, factory } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as pug from 'pug';

import { IEmailMessageInDB } from '../emailMessages';
import { searchApplications, SMART_THEATER_CLIENT_NEW } from '../offers';
import { MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, ONE_MONTH_IN_DAYS } from '../places/movieTheater';
import { DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET } from './screeningEventSeries';

import { ISubscription } from '../../factory/subscription';
import * as TimelineFactory from '../../factory/timeline';

import { validateCsrfToken } from '../../middlewares/validateCsrfToken';

// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions: ISubscription[] = require('../../../subscriptions.json');

const USE_NEW_EVENT_MAKES_OFFER = process.env.USE_NEW_EVENT_MAKES_OFFER === '1';
const DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;
const POS_CLIENT_ID = process.env.POS_CLIENT_ID;

enum DateTimeSettingType {
    Default = 'default',
    Absolute = 'absolute',
    Relative = 'relative'
}

enum OnlineDisplayType {
    Absolute = 'absolute',
    Relative = 'relative'
}

const debug = createDebug('chevre-backend:routes');

const screeningEventRouter = Router();

screeningEventRouter.get(
    '',
    async (req, res, next) => {
        try {
            // timestampパラメータ必須
            if (typeof req.query.timestamp !== 'string' || req.query.timestamp.length === 0) {
                throw new Error('invalid request');
            }

            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            // サブスクリプション決定
            const chevreProject = await projectService.findById({ id: req.project.id });
            let subscriptionIdentifier = chevreProject.subscription?.identifier;
            if (subscriptionIdentifier === undefined) {
                subscriptionIdentifier = 'Free';
            }
            const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);

            const searchMovieTheatersResult = await placeService.searchMovieTheaters({
                limit: 1,
                project: { id: { $eq: req.project.id } }
            });
            if (searchMovieTheatersResult.data.length === 0) {
                throw new Error('施設が見つかりません');
            }

            // 決済方法にムビチケがあるかどうかを確認
            const searchPaymentServicesResult = await productService.search({
                typeOf: { $eq: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket },
                serviceType: { codeValue: { $eq: DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET } }
            });

            const applications = await searchApplications(req);

            res.render('events/screeningEvent/index', {
                defaultMovieTheater: searchMovieTheatersResult.data[0],
                moment: moment,
                subscription,
                useAdvancedScheduling: subscription?.settings.useAdvancedScheduling,
                movieTicketPaymentService: searchPaymentServicesResult.data.shift(),
                applications: applications.map((d) => d.member)
                    .sort((a, b) => {
                        if (String(a.name) < String(b.name)) {
                            return -1;
                        }
                        if (String(a.name) > String(b.name)) {
                            return 1;
                        }

                        return 0;
                    }),
                useNewEventMakesOffer: USE_NEW_EVENT_MAKES_OFFER
            });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * イベントステータス管理
 */
screeningEventRouter.get(
    '/eventStatuses',
    async (req, res, next) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            // サブスクリプション決定
            const chevreProject = await projectService.findById({ id: req.project.id });
            let subscriptionIdentifier = chevreProject.subscription?.identifier;
            if (subscriptionIdentifier === undefined) {
                subscriptionIdentifier = 'Free';
            }
            const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);

            const searchMovieTheatersResult = await placeService.searchMovieTheaters({
                limit: 1,
                project: { id: { $eq: req.project.id } }
            });
            if (searchMovieTheatersResult.data.length === 0) {
                throw new Error('施設が見つかりません');
            }

            // 決済方法にムビチケがあるかどうかを確認
            const searchPaymentServicesResult = await productService.search({
                typeOf: { $eq: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket },
                serviceType: { codeValue: { $eq: DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET } }
            });

            res.render('events/screeningEvent/eventStatuses', {
                defaultMovieTheater: searchMovieTheatersResult.data[0],
                moment: moment,
                subscription,
                useAdvancedScheduling: subscription?.settings.useAdvancedScheduling,
                movieTicketPaymentService: searchPaymentServicesResult.data.shift(),
                EventStatusType: chevre.factory.eventStatusType
            });
        } catch (err) {
            next(err);
        }
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(
    req: Request
): chevre.factory.event.ISearchConditions<chevre.factory.eventType.ScreeningEvent> {
    const now = new Date();
    const format = req.query.format;
    const date = req.query.date;
    const days: number = Number(format);
    const locationId = req.query.theater;
    const screeningRoomBranchCode = req.query.screen;
    const superEventWorkPerformedIdentifierEq = req.query.superEvent?.workPerformed?.identifier;
    const onlyEventScheduled: boolean = req.query.onlyEventScheduled === '1';
    const idEq = req.query.id?.$eq;
    const offersAvailable: boolean = req.query.offersAvailable === '1';
    const offersValid: boolean = req.query.offersValid === '1';
    const availableAtOrFromId = req.query.availableAtOrFromId;

    return {
        sort: { startDate: chevre.factory.sortType.Ascending },
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        eventStatuses: (onlyEventScheduled) ? [chevre.factory.eventStatusType.EventScheduled] : undefined,
        id: { $in: (typeof idEq === 'string' && idEq.length > 0) ? [idEq] : undefined },
        inSessionFrom: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            .toDate(),
        inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            .add(days, 'day')
            .toDate(),
        superEvent: {
            location: { id: { $eq: locationId } },
            workPerformedIdentifiers: (typeof superEventWorkPerformedIdentifierEq === 'string'
                && superEventWorkPerformedIdentifierEq.length > 0)
                ? [superEventWorkPerformedIdentifierEq]
                : undefined
        },
        offers: {
            seller: {
                makesOffer: {
                    $elemMatch: {
                        ...(typeof availableAtOrFromId === 'string')
                            ? {
                                'availableAtOrFrom.id': { $eq: availableAtOrFromId },
                                ...(offersAvailable)
                                    ? {
                                        availabilityEnds: { $gte: now },
                                        availabilityStarts: { $lte: now }
                                    }
                                    : undefined,
                                ...(offersValid)
                                    ? {
                                        validThrough: { $gte: now },
                                        validFrom: { $lte: now }
                                    }
                                    : undefined
                            }
                            : undefined
                    }
                }
            },
            itemOffered: {
                id: {
                    $in: (typeof req.query.itemOffered?.id === 'string' && req.query.itemOffered.id.length > 0)
                        ? [req.query.itemOffered.id]
                        : undefined
                },
                serviceOutput: {
                    reservedTicket: {
                        ticketedSeat: {
                            // 座席指定有のみの検索の場合
                            typeOfs: req.query.onlyReservedSeatsAvailable === '1'
                                ? [chevre.factory.placeType.Seat]
                                : undefined
                        }
                    }
                }
            }
        },
        location: {
            branchCode: {
                $eq: (typeof screeningRoomBranchCode === 'string' && screeningRoomBranchCode.length > 0)
                    ? screeningRoomBranchCode
                    : undefined
            }
        },
        hasOfferCatalog: {
            id: {
                $eq: (typeof req.query.hasOfferCatalog?.id === 'string' && req.query.hasOfferCatalog.id.length > 0)
                    ? req.query.hasOfferCatalog.id
                    : undefined
            }
        }
    };

}
screeningEventRouter.get(
    '/search',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const format = req.query.format;
            const date = req.query.date;
            const locationId = req.query.theater;
            const screeningRoomBranchCode = req.query.screen;
            const searchConditions = createSearchConditions(req);

            if (format === 'table') {
                const limit = Number(req.query.limit);
                const page = Number(req.query.page);
                const { data } = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
                    ...searchConditions,
                    limit: limit,
                    page: page,
                    inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                });

                res.json({
                    success: true,
                    count: (data.length === Number(limit))
                        ? (Number(page) * Number(limit)) + 1
                        : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                    results: data.map((event) => {
                        return {
                            ...event,
                            makesOfferCount:
                                (Array.isArray((<chevre.factory.event.screeningEvent.IOffer | undefined>event.offers)?.seller?.makesOffer))
                                    ? (<chevre.factory.event.screeningEvent.IOffer>event.offers).seller.makesOffer.length
                                    : 0
                        };
                    })
                });
            } else {
                const searchScreeningRoomsResult = await placeService.searchScreeningRooms({
                    limit: 100,
                    project: { id: { $eq: req.project.id } },
                    branchCode: {
                        $eq: (typeof screeningRoomBranchCode === 'string' && screeningRoomBranchCode.length > 0)
                            ? screeningRoomBranchCode
                            : undefined
                    },
                    containedInPlace: {
                        id: { $eq: (typeof locationId === 'string' && locationId.length > 0) ? locationId : undefined }
                    }
                });

                // カレンダー表示の場合すべて検索する
                const limit = 100;
                let page = 0;
                let numData: number = limit;
                const events: chevre.factory.event.IEvent<chevre.factory.eventType.ScreeningEvent>[] = [];
                while (numData === limit) {
                    page += 1;
                    const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
                        ...searchConditions,
                        limit: limit,
                        page: page
                    });
                    numData = searchEventsResult.data.length;
                    events.push(...searchEventsResult.data);
                }

                res.json({
                    performances: events,
                    screens: searchScreeningRoomsResult.data
                });
            }
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message,
                    error: err.message
                });
        }
    }
);

screeningEventRouter.get(
    '/searchScreeningEventSeries',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        try {
            const searchResult = await eventService.search({
                project: { id: { $eq: req.project.id } },
                typeOf: chevre.factory.eventType.ScreeningEventSeries,
                location: {
                    branchCodes: [req.query.movieTheaterBranchCode]
                },
                workPerformed: {
                    identifiers: [req.query.identifier]
                }
            });
            res.json({
                error: undefined,
                screeningEventSeries: searchResult.data
            });
        } catch (err) {
            debug('searchScreeningEvent error', err);
            res.json({
                error: err.message
            });
        }
    }
);

/**
 * 作成token発行
 */
screeningEventRouter.get(
    '/new',
    async (req, res) => {
        try {
            const tokens = new Tokens();
            const csrfSecret = await tokens.secret();
            const csrfToken = tokens.create(csrfSecret);
            (<Express.Session>req.session).csrfSecret = {
                value: csrfSecret,
                createDate: new Date()
            };

            res.json({ token: csrfToken });
        } catch (error) {
            res.status(BAD_REQUEST)
                .json(error);
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
screeningEventRouter.post<ParamsDictionary>(
    '/new',
    validateCsrfToken,
    ...addValidation(),
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const validatorResult = validationResult(req);
            // errors = validatorResult.mapped();
            // const validations = req.validationErrors(true);
            if (!validatorResult.isEmpty()) {
                throw new Error('Invalid');
            }

            debug('saving screening event...', req.body);
            const attributes = await createMultipleEventFromBody(req);
            const events = await eventService.create(attributes);
            debug(events.length, 'events created', events.map((e) => e.id));

            // tslint:disable-next-line:no-dynamic-delete
            delete (<Express.Session>req.session).csrfSecret;
            res.json({
                error: undefined,
                events
            });
        } catch (err) {
            debug('regist error', err);
            const obj = {
                message: err.message,
                error: err.message
            };
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json(obj);
        }
    }
);

/**
 * 複数イベントステータス更新
 */
screeningEventRouter.post(
    '/updateStatuses',
    async (req, res) => {
        try {
            // パフォーマンスIDリストをjson形式で受け取る
            const performanceIds = req.body.performanceIds;
            if (!Array.isArray(performanceIds)) {
                throw new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。');
            }

            const evStatus: chevre.factory.eventStatusType = req.body.evStatus;
            const notice: string = req.body.notice;
            debug('updating performances...', performanceIds, evStatus, notice);

            // 通知対象注文情報取得
            const targetOrders = await getTargetOrdersForNotification(req, performanceIds);

            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
                limit: 100,
                page: 1,
                typeOf: chevre.factory.eventType.ScreeningEvent,
                id: { $in: performanceIds }
            });
            const updatingEvents = searchEventsResult.data;

            // イベント中止メールテンプレートを検索
            const emailMessageService = new chevre.service.EmailMessage({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchEmailMessagesResult = await emailMessageService.search({
                limit: 1,
                page: 1,
                about: { identifier: { $eq: chevre.factory.creativeWork.message.email.AboutIdentifier.OnEventStatusChanged } }
            });
            const emailMessageOnCanceled = searchEmailMessagesResult.data.shift();
            if (emailMessageOnCanceled === undefined) {
                throw new Error('Eメールメッセージテンプレートが見つかりません');
            }

            for (const updatingEvent of updatingEvents) {
                const performanceId = updatingEvent.id;

                let sendEmailMessageParams: chevre.factory.action.transfer.send.message.email.IAttributes[] = [];

                // 運行停止の場合、メール送信指定
                if (evStatus === chevre.factory.eventStatusType.EventCancelled) {
                    const targetOrders4performance = targetOrders
                        .filter((o) => {
                            return Array.isArray(o.acceptedOffers)
                                && o.acceptedOffers.some((offer) => {
                                    const reservation = <chevre.factory.order.IReservation>offer.itemOffered;

                                    return reservation.typeOf === chevre.factory.reservationType.EventReservation
                                        && reservation.reservationFor.id === performanceId;
                                });
                        });
                    sendEmailMessageParams = await createEmails(targetOrders4performance, notice, emailMessageOnCanceled);
                }

                // イベントステータスに反映
                await eventService.updatePartially({
                    id: performanceId,
                    attributes: {
                        typeOf: updatingEvent.typeOf,
                        eventStatus: evStatus,
                        onUpdated: {
                            sendEmailMessage: sendEmailMessageParams
                        }
                    }
                });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json(error);
        }
    }
);

/**
 * シンプルに、イベントに対するReturnedではない注文を全て対象にする
 */
async function getTargetOrdersForNotification(req: Request, performanceIds: string[]): Promise<chevre.factory.order.IOrder[]> {
    const orderService = new chevre.service.Order({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // 全注文検索
    const orders: chevre.factory.order.IOrder[] = [];
    if (performanceIds.length > 0) {
        const limit = 10;
        let page = 0;
        let numData: number = limit;
        while (numData === limit) {
            page += 1;
            const searchOrdersResult = await orderService.search({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project?.id } },
                acceptedOffers: {
                    itemOffered: {
                        // アイテムが予約
                        typeOf: { $in: [chevre.factory.reservationType.EventReservation] },
                        // 予約対象イベントがperformanceIds
                        reservationFor: { ids: performanceIds }
                    }
                },
                // 返品済は除く
                orderStatuses: [chevre.factory.orderStatus.OrderDelivered, chevre.factory.orderStatus.OrderProcessing]
            });
            numData = searchOrdersResult.data.length;
            orders.push(...searchOrdersResult.data);
        }
    }

    return orders;
}

/**
 * 運行・オンライン販売停止メール作成
 */
async function createEmails(
    orders: chevre.factory.order.IOrder[],
    notice: string,
    emailMessageOnCanceled: IEmailMessageInDB
): Promise<chevre.factory.action.transfer.send.message.email.IAttributes[]> {
    if (orders.length === 0) {
        return [];
    }

    return Promise.all(orders.map(async (order) => {
        return createEmail(order, notice, emailMessageOnCanceled);
    }));
}

/**
 * 運行・オンライン販売停止メール作成(1通)
 */
async function createEmail(
    order: chevre.factory.order.IOrder,
    notice: string,
    emailMessageOnCanceled: IEmailMessageInDB
): Promise<chevre.factory.action.transfer.send.message.email.IAttributes> {
    const content = await new Promise<string>((resolve, reject) => {
        pug.render(
            emailMessageOnCanceled.text,
            {
                moment,
                order,
                notice
            },
            (err, message) => {
                if (err instanceof Error) {
                    reject(new chevre.factory.errors.Argument('emailTemplate', err.message));

                    return;
                }

                resolve(message);
            }
        );
    });

    // メール作成
    const emailMessage: chevre.factory.creativeWork.message.email.ICreativeWork = {
        typeOf: chevre.factory.creativeWorkType.EmailMessage,
        identifier: `updateOnlineStatus-${order.orderNumber}`,
        name: `updateOnlineStatus-${order.orderNumber}`,
        sender: {
            typeOf: order.seller.typeOf,
            name: emailMessageOnCanceled.sender.name,
            email: emailMessageOnCanceled.sender.email
        },
        toRecipient: {
            typeOf: order.customer.typeOf,
            name: <string>order.customer.name,
            email: <string>order.customer.email
        },
        about: {
            typeOf: 'Thing',
            identifier: emailMessageOnCanceled.about.identifier,
            name: emailMessageOnCanceled.about.name
        },
        text: content
    };

    const purpose: chevre.factory.order.ISimpleOrder = {
        typeOf: order.typeOf,
        seller: order.seller,
        customer: order.customer,
        orderNumber: order.orderNumber,
        price: order.price,
        priceCurrency: order.priceCurrency,
        orderDate: moment(order.orderDate)
            .toDate()
    };

    const recipient: chevre.factory.action.IParticipantAsPerson | chevre.factory.action.IParticipantAsWebApplication = {
        id: order.customer.id,
        name: emailMessage.toRecipient.name,
        typeOf: <chevre.factory.personType.Person | chevre.factory.creativeWorkType.WebApplication>order.customer.typeOf
    };

    return {
        typeOf: chevre.factory.actionType.SendAction,
        agent: order.project,
        object: emailMessage,
        project: { typeOf: order.project.typeOf, id: order.project.id },
        purpose: purpose,
        recipient
    };
}

/**
 * イベント詳細
 */
screeningEventRouter.get(
    '/:eventId',
    async (req, res, next) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const event = await eventService.findById({ id: req.params.eventId });

            res.render('events/screeningEvent/details', {
                event
            });
        } catch (err) {
            next(err);
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
screeningEventRouter.post<ParamsDictionary>(
    '/:eventId/update',
    ...updateValidation(),
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const validatorResult = validationResult(req);
            // errors = validatorResult.mapped();
            // const validations = req.validationErrors(true);
            if (!validatorResult.isEmpty()) {
                throw new Error('不適切な項目があります');
            }

            const attributes = await createEventFromBody(req);
            await eventService.update({
                id: req.params.eventId,
                attributes: attributes
            });

            res.status(NO_CONTENT)
                .end();
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message,
                    error: err
                });
        }
    }
);

screeningEventRouter.put(
    '/:eventId/cancel',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const event = await eventService.findById({ id: req.params.eventId });
            if (moment(event.startDate)
                .tz('Asia/Tokyo')
                .isSameOrAfter(
                    moment()
                        .tz('Asia/Tokyo'),
                    'day'
                )
            ) {
                await eventService.updatePartially({
                    id: event.id,
                    attributes: {
                        typeOf: event.typeOf,
                        eventStatus: chevre.factory.eventStatusType.EventCancelled,
                        onUpdated: {}
                    }
                });

                res.status(NO_CONTENT)
                    .end();
            } else {
                throw new Error('イベント開始日時が不適切です');
            }
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    error: err.message
                });
        }
    }
);

screeningEventRouter.put(
    '/:eventId/postpone',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const event = await eventService.findById({ id: req.params.eventId });

            await eventService.updatePartially({
                id: event.id,
                attributes: {
                    typeOf: event.typeOf,
                    eventStatus: chevre.factory.eventStatusType.EventPostponed,
                    onUpdated: {}
                }
            });

            res.status(NO_CONTENT)
                .end();
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    error: err.message
                });
        }
    }
);

screeningEventRouter.put(
    '/:eventId/reschedule',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const event = await eventService.findById({ id: req.params.eventId });

            await eventService.updatePartially({
                id: event.id,
                attributes: {
                    typeOf: event.typeOf,
                    eventStatus: chevre.factory.eventStatusType.EventScheduled,
                    onUpdated: {}
                }
            });

            res.status(NO_CONTENT)
                .end();
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    error: err.message
                });
        }
    }
);

screeningEventRouter.post(
    '/:eventId/aggregateReservation',
    async (req, res) => {
        try {
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const taskAttributes: chevre.factory.task.aggregateScreeningEvent.IAttributes = {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                name: chevre.factory.taskName.AggregateScreeningEvent,
                status: chevre.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 1,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    typeOf: chevre.factory.eventType.ScreeningEvent,
                    id: req.params.eventId
                }
            };
            const task = await taskService.create(taskAttributes);

            res.status(CREATED)
                .json(task);
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json(err);
        }
    }
);

screeningEventRouter.get(
    '/:id/hasOfferCatalog',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new chevre.service.OfferCatalog({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.params.id });
            // 興行からカタログを参照する(2022-09-02~)
            const eventServiceId = (<chevre.factory.event.screeningEvent.IOffer | undefined>event.offers)?.itemOffered?.id;
            if (typeof eventServiceId !== 'string') {
                throw new chevre.factory.errors.NotFound('event.offers.itemOffered.id');
            }
            const eventServiceProduct = <factory.product.IProduct>await productService.findById({ id: eventServiceId });
            const offerCatalogId = eventServiceProduct.hasOfferCatalog?.id;
            if (typeof offerCatalogId !== 'string') {
                throw new chevre.factory.errors.NotFound('product.hasOfferCatalog.id');
            }
            const offerCatalog = await offerCatalogService.findById({ id: offerCatalogId });

            res.json(offerCatalog);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

screeningEventRouter.get(
    '/:id/itemOffered',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.params.id });
            const eventServiceId = (<chevre.factory.event.screeningEvent.IOffer | undefined>event.offers)?.itemOffered?.id;
            if (typeof eventServiceId !== 'string') {
                throw new chevre.factory.errors.NotFound('event.offers.itemOffered.id');
            }
            const eventServiceProduct = <factory.product.IProduct>await productService.findById({ id: eventServiceId });

            res.json(eventServiceProduct);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

screeningEventRouter.get(
    '/:id/offers',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const offers = await eventService.searchTicketOffers({
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(Number(req.query.limit), 100) : undefined,
                page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : undefined,
                id: req.params.id
            });

            res.json(offers);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

/**
 * カタログ編集へリダイレクト
 */
screeningEventRouter.get(
    '/:id/showCatalog',
    async (req, res, next) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.params.id });
            const eventServiceId = (<chevre.factory.event.screeningEvent.IOffer | undefined>event.offers)?.itemOffered?.id;
            if (typeof eventServiceId !== 'string') {
                throw new chevre.factory.errors.NotFound('event.offers.itemOffered.id');
            }
            const eventServiceProduct = <factory.product.IProduct>await productService.findById({ id: eventServiceId });
            const offerCatalogId = eventServiceProduct.hasOfferCatalog?.id;
            if (typeof offerCatalogId !== 'string') {
                throw new chevre.factory.errors.NotFound('product.hasOfferCatalog.id');
            }

            const redirect = `/projects/${req.project.id}/offerCatalogs/${offerCatalogId}/update`;
            res.redirect(redirect);
        } catch (error) {
            next(error);
        }
    }
);

screeningEventRouter.get(
    '/:id/updateActions',
    async (req, res) => {
        const actionService = new chevre.service.Action({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        // アクション検索
        const updateActions: chevre.factory.action.IAction<chevre.factory.action.IAttributes<any, any, any>>[] = [];

        try {
            const searchSendActionsResult = await actionService.search({
                limit: 100,
                sort: { startDate: chevre.factory.sortType.Descending },
                typeOf: { $eq: chevre.factory.actionType.UpdateAction },
                object: {
                    id: { $eq: req.params.id }
                }
            });
            updateActions.push(...searchSendActionsResult.data);
        } catch (error) {
            // no op
        }

        res.json(updateActions.map((a) => {
            return {
                ...a,
                timeline: TimelineFactory.createFromAction({
                    project: { id: req.project.id },
                    action: a
                })
            };
        }));
    }
);

screeningEventRouter.get(
    '/:id/aggregateOffer',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.params.id });

            let offers: chevre.factory.event.screeningEvent.IOfferWithAggregateReservation[] = [];
            const offerWithAggregateReservationByEvent = event.aggregateOffer?.offers;
            if (Array.isArray(offerWithAggregateReservationByEvent)) {
                offers = offerWithAggregateReservationByEvent;
            }

            res.json(offers);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

/**
 * イベントの注文検索
 */
screeningEventRouter.get(
    '/:id/orders',
    async (req, res, next) => {
        try {
            const orderService = new chevre.service.Order({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchOrdersResult = await orderService.search({
                limit: req.query.limit,
                page: req.query.page,
                sort: { orderDate: chevre.factory.sortType.Descending },
                project: { id: { $eq: req.project.id } },
                acceptedOffers: {
                    itemOffered: {
                        reservationFor: { ids: [String(req.params.id)] }
                    }
                },
                $projection: {
                    acceptedOffers: 0,
                    seller: 0
                }
            });

            res.json(searchOrdersResult.data);
        } catch (error) {
            next(error);
        }
    }
);

screeningEventRouter.get(
    '/:id/availableSeatOffers',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.params.id });

            const { data } = await eventService.searchSeats({
                id: event.id,
                limit: 100,
                page: 1,
                branchCode: {
                    $regex: (typeof req.query?.branchCode?.$eq === 'string'
                        && req.query?.branchCode?.$eq.length > 0)
                        ? req.query?.branchCode?.$eq
                        : undefined
                }
            });

            res.json(data);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

/**
 * COAイベントインポート
 */
screeningEventRouter.post(
    '/importFromCOA',
    async (req, res, next) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchMovieTheatersResult = await placeService.searchMovieTheaters({
                limit: 1,
                id: { $eq: req.body.theater }
            });
            const movieTheater = searchMovieTheatersResult.data.shift();
            if (movieTheater === undefined) {
                throw new Error('施設が見つかりません');
            }

            const importFrom = moment()
                .toDate();
            const importThrough = moment(importFrom)
                // tslint:disable-next-line:no-magic-numbers
                .add(1, 'week')
                .toDate();
            const taskAttributes: chevre.factory.task.importEventsFromCOA.IAttributes[] = [{
                project: { typeOf: req.project.typeOf, id: req.project.id },
                name: <chevre.factory.taskName.ImportEventsFromCOA>chevre.factory.taskName.ImportEventsFromCOA,
                status: chevre.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 1,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    locationBranchCode: movieTheater.branchCode,
                    importFrom: importFrom,
                    importThrough: importThrough,
                    saveMovieTheater: false,
                    saveScreeningEventSeries: false
                }
            }];

            const tasks = await Promise.all(taskAttributes.map(async (a) => {
                return taskService.create(a);
            }));

            res.status(CREATED)
                .json(tasks);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * イベント更新時のmakesOfferパラメータ(req.body)
 */
interface IMakesOffer4update {
    availableAtOrFrom: { id: string };
    validFromDate: string; //'2022/08/16',
    validFromTime: string; //'09:00',
    validThroughDate: string; //'2022/12/17',
    validThroughTime: string; // '10:00',
    availabilityStartsDate: string; // '2022/08/16',
    availabilityStartsTime: string; //'09:00'
}
// tslint:disable-next-line:max-func-body-length
function createOffers(params: {
    availabilityEnds: Date;
    availabilityStarts: Date;
    eligibleQuantity: { maxValue: number };
    itemOffered: { id: string };
    validFrom: Date;
    validThrough: Date;
    availabilityEndsOnPOS?: Date;
    availabilityStartsOnPOS?: Date;
    validFromOnPOS?: Date;
    validThroughOnPOS?: Date;
    seller: { id: string };
    unacceptedPaymentMethod?: string[];
    reservedSeatsAvailable: boolean;
    // 販売アプリケーションメンバーリスト
    customerMembers: chevre.factory.iam.IMember[];
    endDate: Date;
    startDate: Date;
    isNew: boolean;
    makesOffers4update: IMakesOffer4update[];
}): chevre.factory.event.screeningEvent.IOffers4create {
    const serviceOutput: chevre.factory.event.screeningEvent.IServiceOutput
        = (params.reservedSeatsAvailable)
            ? {
                typeOf: chevre.factory.reservationType.EventReservation,
                reservedTicket: {
                    typeOf: 'Ticket',
                    ticketedSeat: {
                        typeOf: chevre.factory.placeType.Seat
                    }
                }
            }
            : {
                typeOf: chevre.factory.reservationType.EventReservation,
                reservedTicket: {
                    typeOf: 'Ticket'
                }
            };

    // makesOfferを自動設定(2022-11-19~)
    let makesOffer: chevre.factory.event.screeningEvent.ISellerMakesOffer[];

    if (params.isNew) {
        // 新規作成時は、自動的に全販売アプリケーションを設定
        makesOffer = params.customerMembers.map((member) => {
            // POS_CLIENT_IDのみデフォルト設定を調整
            if (typeof POS_CLIENT_ID === 'string' && POS_CLIENT_ID === member.member.id) {
                if (!(params.availabilityEndsOnPOS instanceof Date)
                    || !(params.availabilityStartsOnPOS instanceof Date)
                    || !(params.validFromOnPOS instanceof Date)
                    || !(params.validThroughOnPOS instanceof Date)
                ) {
                    throw new Error('施設のPOS興行初期設定が見つかりません');
                }

                // MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS日前
                // const validFrom4pos: Date = moment(params.startDate)
                //     .add(-MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days')
                //     .toDate();
                // // n秒後
                // const validThrough4pos: Date = moment(params.startDate)
                //     .add(ONE_MONTH_IN_SECONDS, 'seconds')
                //     .toDate();

                return {
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEndsOnPOS, // 1 month later from startDate
                    availabilityStarts: params.availabilityStartsOnPOS, // startのMAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前
                    validFrom: params.validFromOnPOS, // startのMAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前
                    validThrough: params.validThroughOnPOS // 1 month later from startDate
                };
            } else {
                // POS_CLIENT_ID以外は共通設定
                return {
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEnds,
                    availabilityStarts: params.availabilityStarts,
                    validFrom: params.validFrom,
                    validThrough: params.validThrough
                };
            }
        });
    } else {
        makesOffer = [];
        params.makesOffers4update.forEach((makesOffer4update) => {
            const applicationId = String(makesOffer4update.availableAtOrFrom?.id);
            // アプリケーションメンバーの存在検証(バックエンドで検証しているため不要か)
            // const applicationExists = params.customerMembers.some((customerMember) => customerMember.member.id === applicationId);
            // if (!applicationExists) {
            //     throw new Error(`アプリケーション: ${applicationId} が見つかりません`);
            // }

            // アプリケーションの重複を排除
            const alreadyExistsInMakesOffer = makesOffer.some((offer) => {
                return Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom[0]?.id === applicationId;
            });
            if (!alreadyExistsInMakesOffer) {
                // デフォルト設定項目がまだ存在している間は、POS_CLIENT_ID以外のアプリ設定を自動的にデフォルト設定で上書きする
                if (applicationId !== POS_CLIENT_ID && !USE_NEW_EVENT_MAKES_OFFER) {
                    makesOffer.push({
                        typeOf: chevre.factory.offerType.Offer,
                        availableAtOrFrom: [{ id: applicationId }],
                        availabilityEnds: params.availabilityEnds,
                        availabilityStarts: params.availabilityStarts,
                        validFrom: params.validFrom,
                        validThrough: params.validThrough
                    });
                } else {
                    const validFromMoment = moment(`${makesOffer4update.validFromDate}T${makesOffer4update.validFromTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                    const validThroughMoment = moment(`${makesOffer4update.validThroughDate}T${makesOffer4update.validThroughTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                    const availabilityStartsMoment = moment(`${makesOffer4update.availabilityStartsDate}T${makesOffer4update.availabilityStartsTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                    if (!validFromMoment.isValid() || !validThroughMoment.isValid() || !availabilityStartsMoment.isValid()) {
                        throw new Error('販売アプリ設定の日時を正しく入力してください');
                    }
                    makesOffer.push({
                        typeOf: chevre.factory.offerType.Offer,
                        availableAtOrFrom: [{ id: applicationId }],
                        availabilityEnds: validThroughMoment.toDate(),
                        availabilityStarts: availabilityStartsMoment.toDate(),
                        validFrom: validFromMoment.toDate(),
                        validThrough: validThroughMoment.toDate()
                    });
                }
            }
        });
    }

    const seller: chevre.factory.event.screeningEvent.ISeller4create = { id: params.seller.id, makesOffer };

    const makesOfferValidFromMin = moment(params.startDate)
        .add(-MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
    const makesOfferValidFromMax = moment(params.startDate)
        .add(ONE_MONTH_IN_DAYS, 'days');

    const makesOfferOnTransactionApp = makesOffer.find((offer) => {
        return Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom[0].id === SMART_THEATER_CLIENT_NEW;
    });

    const availabilityEnds: Date = (!params.isNew && USE_NEW_EVENT_MAKES_OFFER)
        ? (
            // USE_NEW_EVENT_MAKES_OFFERの場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
            (makesOfferOnTransactionApp !== undefined)
                ? makesOfferOnTransactionApp.availabilityEnds
                // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前まで)
                : makesOfferValidFromMin.toDate()
        )
        : params.availabilityEnds;
    const availabilityStarts: Date = (!params.isNew && USE_NEW_EVENT_MAKES_OFFER)
        ? (
            // USE_NEW_EVENT_MAKES_OFFERの場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
            (makesOfferOnTransactionApp !== undefined)
                ? makesOfferOnTransactionApp.availabilityStarts
                // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前から)
                : makesOfferValidFromMin.toDate()
        )
        : params.availabilityStarts;
    const validFrom: Date = (!params.isNew && USE_NEW_EVENT_MAKES_OFFER)
        ? (
            // USE_NEW_EVENT_MAKES_OFFERの場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
            (makesOfferOnTransactionApp !== undefined)
                ? makesOfferOnTransactionApp.validFrom
                // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前から)
                : makesOfferValidFromMin.toDate()
        )
        : params.validFrom;
    const validThrough: Date = (!params.isNew && USE_NEW_EVENT_MAKES_OFFER)
        ? (
            // USE_NEW_EVENT_MAKES_OFFERの場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
            (makesOfferOnTransactionApp !== undefined)
                ? makesOfferOnTransactionApp.validThrough
                // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前まで)
                : makesOfferValidFromMin.toDate()
        )
        : params.validThrough;

    // 販売期間と表示期間の最小、最大検証(2022-11-25~)
    const isEveryMakesOfferValid = seller.makesOffer.every((offer) => {
        return moment(offer.availabilityEnds)
            .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.availabilityStarts)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.validFrom)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.validThrough)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]');
    });
    if (!isEveryMakesOfferValid) {
        throw new Error(`販売期間と表示期間は${MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS}日前~${ONE_MONTH_IN_DAYS}日後の間で入力してください`);
    }

    return {
        availabilityEnds,
        availabilityStarts,
        eligibleQuantity: { maxValue: Number(params.eligibleQuantity.maxValue) },
        itemOffered: {
            id: params.itemOffered.id,
            serviceOutput
        },
        validFrom,
        validThrough,
        seller,
        ...(Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined
    };
}

function findPlacesFromBody(req: Request) {
    return async (repos: {
        place: chevre.service.Place;
    }) => {
        const movieTheaterBranchCode = String(req.body.theater);

        const searchMovieTheatersResult = await repos.place.searchMovieTheaters({
            limit: 1,
            id: { $eq: movieTheaterBranchCode }
        });
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new Error('施設が見つかりません');
        }

        return { movieTheater };
    };
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createEventFromBody(req: Request): Promise<chevre.factory.event.screeningEvent.ICreateParams> {
    const placeService = new chevre.service.Place({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new chevre.service.Product({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const projectService = new chevre.service.Project({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: '' }
    });

    // サブスクリプション決定
    const chevreProject = await projectService.findById({ id: req.project.id });
    let subscriptionIdentifier = chevreProject.subscription?.identifier;
    if (subscriptionIdentifier === undefined) {
        subscriptionIdentifier = 'Free';
    }
    const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);

    const customerMembers = await searchApplications(req);

    const screeningEventSeriesId: string = req.body.screeningEventId;

    const screeningRoomBranchCode: string = req.body.screen;
    const { movieTheater } = await findPlacesFromBody(req)({ place: placeService });

    const sellerId: string = req.body.seller;

    // プロダクト検索に変更(2022-11-05)
    const searchEventServicesResult = await productService.search({
        limit: 1,
        typeOf: { $eq: chevre.factory.product.ProductType.EventService },
        id: { $eq: `${req.body.eventServiceId}` }
    });
    const eventServiceProduct = <factory.product.IProduct | undefined>searchEventServicesResult.data.shift();
    if (eventServiceProduct === undefined) {
        throw new Error('興行が見つかりません');
    }
    if (typeof eventServiceProduct.hasOfferCatalog?.id !== 'string') {
        throw new Error('興行のカタログ設定が見つかりません');
    }

    let offersValidAfterStart: number;
    if (req.body.endSaleTimeAfterScreening !== undefined && req.body.endSaleTimeAfterScreening !== '') {
        offersValidAfterStart = Number(req.body.endSaleTimeAfterScreening);
    } else if (typeof movieTheater.offers?.availabilityEndsGraceTime?.value === 'number') {
        // tslint:disable-next-line:no-magic-numbers
        offersValidAfterStart = Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60);
    } else {
        offersValidAfterStart = DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES;
    }

    const doorTime = moment(`${req.body.day}T${req.body.doorTime}+09:00`, 'YYYYMMDDTHHmmZ')
        .toDate();
    const startDate = moment(`${req.body.day}T${req.body.startTime}+09:00`, 'YYYYMMDDTHHmmZ')
        .toDate();
    const endDate: Date = moment(`${req.body.endDay}T${req.body.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
        .toDate();
    const salesStartDate = moment(`${req.body.saleStartDate}T${req.body.saleStartTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
        .toDate();
    const salesEndDate = (typeof req.body.saleEndDate === 'string'
        && req.body.saleEndDate.length > 0
        && typeof req.body.saleEndTime === 'string'
        && req.body.saleEndTime.length > 0)
        ? moment(`${req.body.saleEndDate}T${req.body.saleEndTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
            .toDate()
        : moment(startDate)
            .add(offersValidAfterStart, 'minutes')
            .toDate();

    // オンライン表示開始日時は、絶対指定or相対指定
    const onlineDisplayStartDate = (String(req.body.onlineDisplayType) === OnlineDisplayType.Relative)
        ? moment(`${moment(startDate)
            .tz('Asia/Tokyo')
            .format('YYYY-MM-DD')}T00:00:00+09:00`)
            .add(Number(req.body.onlineDisplayStartDate) * -1, 'days')
            .toDate()
        // tslint:disable-next-line:max-line-length
        : moment(`${String(req.body.onlineDisplayStartDate)}T${String(req.body.onlineDisplayStartTime)}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
            .toDate();

    let unacceptedPaymentMethod: string[] | undefined;

    // ムビチケ除外の場合は対応決済方法を追加
    if (req.body.mvtkExcludeFlg === '1' || req.body.mvtkExcludeFlg === DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET) {
        if (!Array.isArray(unacceptedPaymentMethod)) {
            unacceptedPaymentMethod = [];
        }
        unacceptedPaymentMethod.push(DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET);
    }

    const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
        ? Number(req.body.maximumAttendeeCapacity)
        : undefined;
    validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity);

    const offers = createOffers({
        availabilityEnds: salesEndDate,
        availabilityStarts: onlineDisplayStartDate,
        eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
        itemOffered: { id: String(eventServiceProduct.id) },
        validFrom: salesStartDate,
        validThrough: salesEndDate,
        seller: { id: sellerId },
        unacceptedPaymentMethod,
        reservedSeatsAvailable: req.body.reservedSeatsAvailable === '1',
        customerMembers,
        endDate,
        startDate,
        isNew: false,
        makesOffers4update: req.body.makesOffer
    });

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        doorTime: doorTime,
        startDate,
        endDate,
        // 最適化(2022-10-01~)
        // workPerformed: superEvent.workPerformed,
        // 最適化(2022-10-01~)
        location: {
            branchCode: screeningRoomBranchCode,
            ...(typeof maximumAttendeeCapacity === 'number')
                ? { maximumAttendeeCapacity }
                : undefined
        },
        // 最適化(2022-10-01~)
        superEvent: { id: screeningEventSeriesId },
        // 最適化(2022-10-01~)
        // name: superEvent.name,
        eventStatus: chevre.factory.eventStatusType.EventScheduled,
        offers: offers,
        // 最適化(2022-10-01~)
        // checkInCount: undefined,
        // attendeeCount: undefined,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : []
    };
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
async function createMultipleEventFromBody(req: Request): Promise<chevre.factory.event.screeningEvent.ICreateParams[]> {
    const placeService = new chevre.service.Place({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new chevre.service.Product({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const projectService = new chevre.service.Project({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: '' }
    });

    // サブスクリプション決定
    const chevreProject = await projectService.findById({ id: req.project.id });
    let subscriptionIdentifier = chevreProject.subscription?.identifier;
    if (subscriptionIdentifier === undefined) {
        subscriptionIdentifier = 'Free';
    }
    const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);

    const customerMembers = await searchApplications(req);

    const screeningEventSeriesId: string = req.body.screeningEventId;
    const screeningRoomBranchCode: string = req.body.screen;
    const sellerId: string = req.body.seller;

    const { movieTheater } = await findPlacesFromBody(req)({ place: placeService });

    const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
        ? Number(req.body.maximumAttendeeCapacity)
        : undefined;
    validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity);

    const startDate = moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
        .tz('Asia/Tokyo');
    const toDate = moment(`${req.body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
        .tz('Asia/Tokyo');
    const weekDays: string[] = req.body.weekDayData;
    // 現時点でカタログIDとして受け取っている
    const eventServiceIds: string[] = req.body.eventServiceIds;
    const mvtkExcludeFlgs: string[] = req.body.mvtkExcludeFlgData;
    const timeData: { doorTime: string; startTime: string; endTime: string; endDayRelative: string }[] = req.body.timeData;

    // 興行IDとして受け取る(2022-11-05~)
    const searchEventServicesResult = await productService.search({
        limit: 100,
        page: 1,
        typeOf: { $eq: chevre.factory.product.ProductType.EventService },
        id: { $in: eventServiceIds }
    });
    const eventServiceProducts = <factory.product.IProduct[]>searchEventServicesResult.data;

    const attributes: chevre.factory.event.screeningEvent.ICreateParams[] = [];
    for (let date = startDate; date <= toDate; date = date.add(1, 'day')) {
        const formattedDate = date.format('YYYY/MM/DD');

        const day = date.get('day')
            .toString();
        if (weekDays.indexOf(day) >= 0) {
            // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
            timeData.forEach((data, i) => {
                // tslint:disable-next-line:max-line-length
                const offersValidAfterStart = (req.body.endSaleTimeAfterScreening !== undefined && req.body.endSaleTimeAfterScreening !== '')
                    ? Number(req.body.endSaleTimeAfterScreening)
                    : DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES;
                const eventStartDate = moment(`${formattedDate}T${data.startTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                    .toDate();
                const endDayRelative = Number(data.endDayRelative);
                // tslint:disable-next-line:no-magic-numbers
                if (endDayRelative < 0 || endDayRelative > 31) {
                    throw new Error('終了日の相対設定は1カ月以内で設定してください');
                }
                const formattedEndDate = moment(date)
                    .add(endDayRelative, 'days')
                    .format('YYYY/MM/DD');

                // 販売開始日時は、施設設定 or 絶対指定 or 相対指定
                let salesStartDate: Date;
                switch (String(req.body.saleStartDateType)) {
                    case DateTimeSettingType.Absolute:
                        salesStartDate = moment(`${String(req.body.saleStartDate)}T${req.body.saleStartTime}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
                            .toDate();
                        break;

                    case DateTimeSettingType.Relative:
                        salesStartDate = moment(`${moment(eventStartDate)
                            .tz('Asia/Tokyo')
                            .format('YYYY-MM-DD')}T00:00:00+09:00`)
                            .add(Number(req.body.saleStartDate) * -1, 'days')
                            .toDate();
                        break;

                    default:
                        salesStartDate = moment(`${formattedDate}T0000+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .add(parseInt(req.body.saleStartDays, 10) * -1, 'day')
                            .toDate();
                }

                // 販売終了日時は、施設設定 or 絶対指定
                let salesEndDate: Date;
                switch (String(req.body.saleEndDateType)) {
                    case DateTimeSettingType.Absolute:
                        salesEndDate = moment(`${String(req.body.saleEndDate)}T${req.body.saleEndTime}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
                            .toDate();
                        break;

                    case DateTimeSettingType.Relative:
                        salesEndDate = moment(eventStartDate)
                            .add(Number(req.body.saleEndDate), 'minutes')
                            .toDate();
                        break;

                    default:
                        salesEndDate = moment(eventStartDate)
                            .add(offersValidAfterStart, 'minutes')
                            .toDate();
                }

                // オンライン表示開始日時は、絶対指定or相対指定
                const onlineDisplayStartDate = (String(req.body.onlineDisplayType) === OnlineDisplayType.Relative)
                    ? moment(`${moment(eventStartDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY-MM-DD')}T00:00:00+09:00`)
                        .add(Number(req.body.onlineDisplayStartDate) * -1, 'days')
                        .toDate()
                    // tslint:disable-next-line:max-line-length
                    : moment(`${String(req.body.onlineDisplayStartDate)}T${String(req.body.onlineDisplayStartTime)}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
                        .toDate();

                let unacceptedPaymentMethod: string[] | undefined;

                // ムビチケ除外の場合は対応決済方法を追加
                if (mvtkExcludeFlgs[i] === '1' || mvtkExcludeFlgs[i] === DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET) {
                    if (!Array.isArray(unacceptedPaymentMethod)) {
                        unacceptedPaymentMethod = [];
                    }
                    unacceptedPaymentMethod.push(DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET);
                }

                const eventServiceProduct = eventServiceProducts.find((p) => p.id === `${eventServiceIds[i]}`);
                if (eventServiceProduct === undefined) {
                    throw new Error('興行が見つかりません');
                }
                if (typeof eventServiceProduct.hasOfferCatalog?.id !== 'string') {
                    throw new Error('興行のカタログ設定が見つかりません');
                }

                const endDate: Date = moment(`${formattedEndDate}T${data.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                    .toDate();

                // POSの興行初期設定を施設から取得(2022-11-24~)
                if (typeof movieTheater.offers?.availabilityStartsGraceTimeOnPOS.value !== 'number'
                    || typeof movieTheater.offers?.availabilityEndsGraceTimeOnPOS.value !== 'number') {
                    throw new Error('施設のPOS興行初期設定が見つかりません');
                }
                const validFromOnPOS: Date = moment(eventStartDate)
                    .add(movieTheater.offers.availabilityStartsGraceTimeOnPOS.value, 'days')
                    .toDate();
                const validThroughOnPOS: Date = moment(eventStartDate)
                    .add(movieTheater.offers.availabilityEndsGraceTimeOnPOS.value, 'seconds')
                    .toDate();
                const availabilityEndsOnPOS = validThroughOnPOS;
                const availabilityStartsOnPOS = validFromOnPOS;

                const offers = createOffers({
                    availabilityEnds: salesEndDate,
                    availabilityStarts: onlineDisplayStartDate,
                    eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
                    itemOffered: {
                        id: String(eventServiceProduct.id)
                    },
                    validFrom: salesStartDate,
                    validThrough: salesEndDate,
                    availabilityEndsOnPOS,
                    availabilityStartsOnPOS,
                    validFromOnPOS,
                    validThroughOnPOS,
                    seller: { id: sellerId },
                    unacceptedPaymentMethod,
                    reservedSeatsAvailable: req.body.reservedSeatsAvailable === '1',
                    customerMembers,
                    endDate,
                    startDate: eventStartDate,
                    isNew: true,
                    makesOffers4update: []
                });

                attributes.push({
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.eventType.ScreeningEvent,
                    doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                        .toDate(),
                    startDate: eventStartDate,
                    endDate,
                    // workPerformed: superEvent.workPerformed,
                    // 最適化(2022-10-01~)
                    location: {
                        branchCode: screeningRoomBranchCode,
                        ...(typeof maximumAttendeeCapacity === 'number')
                            ? { maximumAttendeeCapacity }
                            : undefined
                    },
                    // 最適化(2022-10-01~)
                    superEvent: { id: screeningEventSeriesId },
                    // 最適化(2022-10-01~)
                    // name: superEvent.name,
                    eventStatus: chevre.factory.eventStatusType.EventScheduled,
                    offers: offers
                    // checkInCount: undefined,
                    // attendeeCount: undefined
                });
            });
        }
    }

    return attributes;
}

function validateMaximumAttendeeCapacity(
    subscription?: ISubscription,
    maximumAttendeeCapacity?: number
) {
    if (subscription?.settings.allowNoCapacity !== true) {
        if (typeof maximumAttendeeCapacity !== 'number') {
            throw new Error('キャパシティを入力してください');
        }
    }

    if (typeof maximumAttendeeCapacity === 'number') {
        if (maximumAttendeeCapacity < 0) {
            throw new Error('キャパシティには正の値を入力してください');
        }

        const maximumAttendeeCapacitySetting = subscription?.settings.maximumAttendeeCapacity;
        if (typeof maximumAttendeeCapacitySetting === 'number') {
            if (maximumAttendeeCapacity > maximumAttendeeCapacitySetting) {
                throw new Error(`キャパシティの最大値は${maximumAttendeeCapacitySetting}です`);
            }
        }
    }
}

/**
 * 新規登録バリデーション
 */
function addValidation() {
    return [
        body('screeningEventId', '施設コンテンツが未選択です')
            .notEmpty(),
        body('startDate', '開催日が未選択です')
            .notEmpty(),
        body('toDate', '開催日が未選択です')
            .notEmpty(),
        body('weekDayData', '曜日が未選択です')
            .notEmpty(),
        body('screen', 'ルームが未選択です')
            .notEmpty(),
        body('theater', '施設が未選択です')
            .notEmpty(),
        body('timeData', '時間情報が未選択です')
            .notEmpty(),
        body('eventServiceIds', '興行が未選択です')
            .notEmpty(),
        body('seller')
            .notEmpty()
            .withMessage('販売者が未選択です')
            .isString(),
        body('maxSeatNumber')
            .not()
            .isEmpty()
            .isInt({ min: 0, max: 50 })
            .toInt()
            .withMessage(() => '0~50の間で入力してください'),
        body([
            'additionalProperty.*.name'
        ])
            .optional()
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .if((value: any) => String(value).length > 0)
            .isLength({ min: 8 })
            .withMessage('8文字以上で入力してください')

    ];
}
/**
 * 編集バリデーション
 */
function updateValidation() {
    return [
        body('screeningEventId', '施設コンテンツが未選択です')
            .notEmpty(),
        body('day', '開催日が未選択です')
            .notEmpty(),
        body('doorTime', '開場時刻が未選択です')
            .notEmpty(),
        body('startTime', '開始時刻が未選択です')
            .notEmpty(),
        body('endTime', '終了時刻が未選択です')
            .notEmpty(),
        body('screen', 'ルームが未選択です')
            .notEmpty(),
        body('eventServiceId', '興行が未選択です')
            .notEmpty(),
        body('seller')
            .notEmpty()
            .withMessage('販売者が未選択です')
            .isString(),
        body('maxSeatNumber')
            .not()
            .isEmpty()
            .isInt({ min: 0, max: 50 })
            .toInt()
            .withMessage(() => '0~50の間で入力してください'),
        body([
            'additionalProperty.*.name'
        ])
            .optional()
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .if((value: any) => String(value).length > 0)
            .isLength({ min: 8 })
            .withMessage('8文字以上で入力してください')
    ];
}

export { screeningEventRouter };
