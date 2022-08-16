/**
 * イベント管理ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as pug from 'pug';

import { IEmailMessageInDB } from '../emailMessages';
import { DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET } from './screeningEventSeries';

import { ProductType } from '../../factory/productType';
import { ISubscription } from '../../factory/subscription';
import * as TimelineFactory from '../../factory/timeline';

// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions: ISubscription[] = require('../../../subscriptions.json');

const DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;

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
            debug('searchPaymentServicesResult:', searchPaymentServicesResult);

            res.render('events/screeningEvent/index', {
                defaultMovieTheater: searchMovieTheatersResult.data[0],
                moment: moment,
                subscription,
                useAdvancedScheduling: subscription?.settings.useAdvancedScheduling,
                movieTicketPaymentService: searchPaymentServicesResult.data.shift()
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
            debug('searchPaymentServicesResult:', searchPaymentServicesResult);

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

function createSearchConditions(
    req: Request
): chevre.factory.event.ISearchConditions<chevre.factory.eventType.ScreeningEvent> {
    const now = new Date();
    const format = req.query.format;
    const date = req.query.date;
    const days = Number(format);
    const locationId = req.query.theater;
    const screeningRoomBranchCode = req.query.screen;
    const superEventWorkPerformedIdentifierEq = req.query.superEvent?.workPerformed?.identifier;
    const onlyEventScheduled = req.query.onlyEventScheduled === '1';

    return {
        sort: { startDate: chevre.factory.sortType.Ascending },
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        eventStatuses: (onlyEventScheduled) ? [chevre.factory.eventStatusType.EventScheduled] : undefined,
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
            availableFrom: (req.query.offersAvailable === '1') ? now : undefined,
            availableThrough: (req.query.offersAvailable === '1') ? now : undefined,
            validFrom: (req.query.offersValid === '1') ? now : undefined,
            validThrough: (req.query.offersValid === '1') ? now : undefined,
            itemOffered: {
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
                const { data } = await eventService.search({
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
                    results: data
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
                    const searchEventsResult = await eventService.search({
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
            res.status(INTERNAL_SERVER_ERROR)
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

// tslint:disable-next-line:use-default-type-parameter
screeningEventRouter.post<ParamsDictionary>(
    '/regist',
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
            res.json({
                error: undefined
            });
        } catch (err) {
            debug('regist error', err);
            const obj = {
                message: err.message,
                error: err.message
            };
            if (err.code === BAD_REQUEST) {
                res.status(err.code)
                    .json(obj);
            } else {
                res.status(INTERNAL_SERVER_ERROR)
                    .json(obj);
            }
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

                // Chevreイベントステータスに反映
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
            res.status(INTERNAL_SERVER_ERROR)
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
        project: { typeOf: order.project.typeOf, id: order.project.id },
        typeOf: order.typeOf,
        seller: order.seller,
        customer: order.customer,
        confirmationNumber: order.confirmationNumber,
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
            res.status(BAD_REQUEST)
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
            res.status(INTERNAL_SERVER_ERROR)
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
        const offerCatalogService = new chevre.service.OfferCatalog({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.params.id });
            if (typeof event.hasOfferCatalog?.id !== 'string') {
                throw new chevre.factory.errors.NotFound('OfferCatalog');
            }

            const offerCatalog = await offerCatalogService.findById({ id: event.hasOfferCatalog.id });

            res.json(offerCatalog);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
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
            const offers = await eventService.searchTicketOffers({ id: req.params.id });

            res.json(offers);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
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
            res.status(INTERNAL_SERVER_ERROR)
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
            res.status(INTERNAL_SERVER_ERROR)
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
                    importThrough: importThrough
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

function minimizeSuperEvent(
    screeningEventSeries: chevre.factory.event.screeningEventSeries.IEvent
): chevre.factory.event.screeningEvent.ISuperEvent {
    return {
        typeOf: screeningEventSeries.typeOf,
        project: screeningEventSeries.project,
        id: screeningEventSeries.id,
        videoFormat: screeningEventSeries.videoFormat,
        soundFormat: screeningEventSeries.soundFormat,
        workPerformed: screeningEventSeries.workPerformed,
        location: screeningEventSeries.location,
        kanaName: screeningEventSeries.kanaName,
        name: screeningEventSeries.name,
        // 最適化(2022-05-31~)
        // eventStatus: screeningEventSeries.eventStatus,
        ...(Array.isArray(screeningEventSeries.additionalProperty))
            ? { additionalProperty: screeningEventSeries.additionalProperty }
            : undefined,
        ...(screeningEventSeries.startDate !== undefined)
            ? { startDate: screeningEventSeries.startDate }
            : undefined,
        ...(screeningEventSeries.endDate !== undefined)
            ? { endDate: screeningEventSeries.endDate }
            : undefined,
        ...(screeningEventSeries.description !== undefined)
            ? { description: screeningEventSeries.description }
            : undefined,
        ...(screeningEventSeries.headline !== undefined)
            ? { headline: screeningEventSeries.headline }
            : undefined,
        ...(screeningEventSeries.dubLanguage !== undefined)
            ? { dubLanguage: screeningEventSeries.dubLanguage }
            : undefined,
        ...(screeningEventSeries.subtitleLanguage !== undefined)
            ? { subtitleLanguage: screeningEventSeries.subtitleLanguage }
            : undefined
    };
}

function createLocation(
    project: { id: string },
    screeningRoom: Omit<chevre.factory.place.screeningRoom.IPlace, 'containsPlace'>,
    maximumAttendeeCapacity?: number
): chevre.factory.event.screeningEvent.ILocation {
    return {
        project: { typeOf: chevre.factory.organizationType.Project, id: project.id },
        typeOf: screeningRoom.typeOf,
        branchCode: screeningRoom.branchCode,
        name: screeningRoom.name,
        // name: screeningRoom.name === undefined
        //     ? { en: '', ja: '', kr: '' }
        //     : <chevre.factory.multilingualString>screeningRoom.name,
        // alternateName: <chevre.factory.multilingualString>screeningRoom.alternateName,
        address: screeningRoom.address,
        ...(typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined
    };
}

function createOffers(params: {
    project: { id: string };
    availabilityEnds: Date;
    availabilityStarts: Date;
    eligibleQuantity: { maxValue: number };
    itemOffered: {
        serviceType?: chevre.factory.categoryCode.ICategoryCode;
    };
    validFrom: Date;
    validThrough: Date;
    seller: chevre.factory.seller.ISeller;
    unacceptedPaymentMethod?: string[];
    reservedSeatsAvailable: boolean;
}): chevre.factory.event.screeningEvent.IOffer {
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

    return {
        project: { typeOf: chevre.factory.organizationType.Project, id: params.project.id },
        typeOf: chevre.factory.offerType.Offer,
        priceCurrency: chevre.factory.priceCurrency.JPY,
        availabilityEnds: params.availabilityEnds,
        availabilityStarts: params.availabilityStarts,
        eligibleQuantity: {
            typeOf: 'QuantitativeValue',
            unitCode: chevre.factory.unitCode.C62,
            maxValue: Number(params.eligibleQuantity.maxValue),
            value: 1
        },
        itemOffered: {
            serviceOutput,
            ...(typeof params.itemOffered.serviceType?.typeOf === 'string')
                ? {
                    serviceType: {
                        codeValue: params.itemOffered.serviceType.codeValue,
                        id: params.itemOffered.serviceType.id,
                        inCodeSet: params.itemOffered.serviceType.inCodeSet,
                        name: params.itemOffered.serviceType.name,
                        project: params.itemOffered.serviceType.project,
                        typeOf: params.itemOffered.serviceType.typeOf
                    }
                }
                : undefined
        },
        validFrom: params.validFrom,
        validThrough: params.validThrough,
        seller: {
            typeOf: params.seller.typeOf,
            id: String(params.seller.id),
            name: params.seller.name
        },
        ...(Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined
    };
}

function findPlacesFromBody(req: Request) {
    return async (repos: {
        place: chevre.service.Place;
    }) => {
        const movieTheaterBranchCode = String(req.body.theater);
        const screeningRoomBranchCode = String(req.body.screen);

        const searchMovieTheatersResult = await repos.place.searchMovieTheaters({
            limit: 1,
            id: { $eq: movieTheaterBranchCode }
        });
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new Error('施設が見つかりません');
        }
        const searchRoomsResult = await repos.place.searchScreeningRooms({
            limit: 1,
            containedInPlace: { id: { $eq: movieTheaterBranchCode } },
            branchCode: { $eq: screeningRoomBranchCode }
        });
        const screeningRoom = searchRoomsResult.data.shift();
        // const movieTheater = await repos.place.findMovieTheaterById({ id: movieTheaterBranchCode });
        // const screeningRoom = <chevre.factory.place.screeningRoom.IPlace | undefined>
        //     movieTheater.containsPlace.find((p) => p.branchCode === screeningRoomBranchCode);
        if (screeningRoom === undefined) {
            throw new Error('ルームが見つかりません');
        }
        // if (screeningRoom.name === undefined) {
        //     throw new Error('ルーム名称が見つかりません');
        // }

        return { movieTheater, screeningRoom };
    };
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createEventFromBody(req: Request): Promise<chevre.factory.event.screeningEvent.IAttributes> {
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
    const offerCatalogService = new chevre.service.OfferCatalog({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const sellerService = new chevre.service.Seller({
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

    const screeningEventSeries = await eventService.findById<chevre.factory.eventType.ScreeningEventSeries>({
        id: req.body.screeningEventId
    });

    const { movieTheater, screeningRoom } = await findPlacesFromBody(req)({ place: placeService });

    const seller = await sellerService.findById({ id: req.body.seller });

    const catalog = await offerCatalogService.findById({ id: req.body.ticketTypeGroup });
    if (typeof catalog.id !== 'string') {
        throw new Error('Offer Catalog ID undefined');
    }

    let serviceType: chevre.factory.categoryCode.ICategoryCode | undefined;
    const offerCatagoryServiceTypeCode = catalog.itemOffered.serviceType?.codeValue;
    if (typeof offerCatagoryServiceTypeCode === 'string') {
        const searchServiceTypesResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
            codeValue: { $eq: offerCatagoryServiceTypeCode }
        });
        serviceType = searchServiceTypesResult.data.shift();
        if (serviceType === undefined) {
            throw new Error('サービス区分が見つかりません');
        }
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
    const endDate = moment(`${req.body.endDay}T${req.body.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
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
        project: { id: req.project.id },
        availabilityEnds: salesEndDate,
        availabilityStarts: onlineDisplayStartDate,
        eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
        itemOffered: { serviceType },
        validFrom: salesStartDate,
        validThrough: salesEndDate,
        seller: seller,
        unacceptedPaymentMethod,
        reservedSeatsAvailable: req.body.reservedSeatsAvailable === '1'
    });
    const superEvent = minimizeSuperEvent(screeningEventSeries);
    const eventLocation = createLocation({ id: req.project.id }, screeningRoom, maximumAttendeeCapacity);

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        doorTime: doorTime,
        startDate: startDate,
        endDate: endDate,
        workPerformed: superEvent.workPerformed,
        location: eventLocation,
        superEvent: superEvent,
        name: superEvent.name,
        eventStatus: chevre.factory.eventStatusType.EventScheduled,
        offers: offers,
        checkInCount: undefined,
        attendeeCount: undefined,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : [],
        hasOfferCatalog: {
            typeOf: 'OfferCatalog',
            id: catalog.id,
            identifier: catalog.identifier
        }
    };
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
async function createMultipleEventFromBody(req: Request): Promise<chevre.factory.event.screeningEvent.IAttributes[]> {
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
    const offerCatalogService = new chevre.service.OfferCatalog({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const sellerService = new chevre.service.Seller({
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

    const screeningEventSeries = await eventService.findById<chevre.factory.eventType.ScreeningEventSeries>({
        id: req.body.screeningEventId
    });

    const { screeningRoom } = await findPlacesFromBody(req)({ place: placeService });

    const seller = await sellerService.findById({ id: req.body.seller });

    const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
        ? Number(req.body.maximumAttendeeCapacity)
        : undefined;
    validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity);

    const startDate = moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
        .tz('Asia/Tokyo');
    const toDate = moment(`${req.body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
        .tz('Asia/Tokyo');
    const weekDays: string[] = req.body.weekDayData;
    const ticketTypeIds: string[] = req.body.ticketData;
    const mvtkExcludeFlgs: string[] = req.body.mvtkExcludeFlgData;
    const timeData: { doorTime: string; startTime: string; endTime: string; endDayRelative: string }[] = req.body.timeData;

    // const ticketTypeGroups = searchTicketTypeGroupsResult.data;
    // 100件以上に対応
    const ticketTypeGroups: chevre.factory.offerCatalog.IOfferCatalog[] = [];
    // UIの制限上、ticketTypeIdsは100件未満なので↓で問題なし
    const searchTicketTypeGroupsResult = await offerCatalogService.search({
        limit: 100,
        page: 1,
        project: { id: { $eq: req.project.id } },
        itemOffered: { typeOf: { $eq: ProductType.EventService } },
        id: { $in: ticketTypeIds }
    });
    ticketTypeGroups.push(...searchTicketTypeGroupsResult.data);

    // カタログ検索結果に含まれるサービス区分のみ検索する(code.$in)
    const serviceTypeCodeValues: string[] = ticketTypeGroups.filter((o) => typeof o.itemOffered.serviceType?.codeValue === 'string')
        .map((o) => <string>o.itemOffered.serviceType?.codeValue);
    const searchServiceTypesResult = await categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
        codeValue: { $in: serviceTypeCodeValues }
    });
    const serviceTypes = searchServiceTypesResult.data;

    const attributes: chevre.factory.event.screeningEvent.IAttributes[] = [];
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

                const ticketTypeGroup = ticketTypeGroups.find((t) => t.id === ticketTypeIds[i]);
                if (ticketTypeGroup === undefined) {
                    throw new Error('オファーカタログが見つかりません');
                }
                if (typeof ticketTypeGroup.id !== 'string') {
                    throw new Error('Offer Catalog ID undefined');
                }

                let serviceType: chevre.factory.categoryCode.ICategoryCode | undefined;
                const offerCatagoryServiceTypeCode = ticketTypeGroup.itemOffered.serviceType?.codeValue;
                if (typeof offerCatagoryServiceTypeCode === 'string') {
                    serviceType = serviceTypes.find((t) => t.codeValue === offerCatagoryServiceTypeCode);
                    if (serviceType === undefined) {
                        throw new chevre.factory.errors.NotFound('サービス区分');
                    }
                }

                const offers = createOffers({
                    project: { id: req.project.id },
                    availabilityEnds: salesEndDate,
                    availabilityStarts: onlineDisplayStartDate,
                    eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
                    itemOffered: { serviceType },
                    validFrom: salesStartDate,
                    validThrough: salesEndDate,
                    seller: seller,
                    unacceptedPaymentMethod,
                    reservedSeatsAvailable: req.body.reservedSeatsAvailable === '1'
                });
                const superEvent = minimizeSuperEvent(screeningEventSeries);
                const eventLocation = createLocation({ id: req.project.id }, screeningRoom, maximumAttendeeCapacity);

                attributes.push({
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.eventType.ScreeningEvent,
                    doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                        .toDate(),
                    startDate: eventStartDate,
                    endDate: moment(`${formattedEndDate}T${data.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                        .toDate(),
                    workPerformed: superEvent.workPerformed,
                    location: eventLocation,
                    superEvent: superEvent,
                    name: superEvent.name,
                    eventStatus: chevre.factory.eventStatusType.EventScheduled,
                    offers: offers,
                    checkInCount: undefined,
                    attendeeCount: undefined,
                    hasOfferCatalog: {
                        typeOf: 'OfferCatalog',
                        id: ticketTypeGroup.id,
                        identifier: ticketTypeGroup.identifier
                    }
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
        body('ticketData', 'カタログが未選択です')
            .notEmpty(),
        body('seller', '販売者が未選択です')
            .notEmpty()
    ];
}
/**
 * 編集バリデーション
 */
function updateValidation() {
    return [
        body('screeningEventId', '上映イベントシリーズが未選択です')
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
        body('ticketTypeGroup', 'カタログが未選択です')
            .notEmpty(),
        body('seller', '販売者が未選択です')
            .notEmpty()
    ];
}

export default screeningEventRouter;
