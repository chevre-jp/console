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

import { searchApplications } from '../offers';

import { ISubscription } from '../../factory/subscription';
import * as TimelineFactory from '../../factory/timeline';
import {
    createEmails,
    createOffers4event,
    DateTimeSettingType,
    DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES,
    OnlineDisplayType,
    validateMaximumAttendeeCapacity
} from './factory';

import { validateCsrfToken } from '../../middlewares/validateCsrfToken';

// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions: ISubscription[] = require('../../../subscriptions.json');

const debug = createDebug('chevre-backend:routes');

const eventRouter = Router();

eventRouter.get(
    '',
    async (req, res, next) => {
        try {
            // timestampパラメータ必須
            const timestamp = typeof req.query.timestamp;
            if (typeof timestamp !== 'string' || timestamp.length === 0) {
                throw new Error('invalid request');
            }

            const itemOfferedTypeOf = req.query.itemOffered?.typeOf;
            if (typeof itemOfferedTypeOf !== 'string' || itemOfferedTypeOf.length === 0) {
                res.redirect(`/projects/${req.project.id}/events/screeningEvent?timestamp=${timestamp}&itemOffered[typeOf]=${chevre.factory.product.ProductType.EventService}`);

                return;
            }

            const placeService = new chevre.service.Place({
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

            const applications = await searchApplications(req);

            res.render('events/event/index', {
                defaultMovieTheater: searchMovieTheatersResult.data[0],
                moment: moment,
                subscription,
                useAdvancedScheduling: subscription?.settings.useAdvancedScheduling,
                applications: applications.map((d) => d.member)
                    .sort((a, b) => {
                        if (String(a.name) < String(b.name)) {
                            return -1;
                        }
                        if (String(a.name) > String(b.name)) {
                            return 1;
                        }

                        return 0;
                    })
            });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * イベントステータス管理
 */
eventRouter.get(
    '/eventStatuses',
    async (req, res, next) => {
        try {
            const placeService = new chevre.service.Place({
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

            res.render('events/event/eventStatuses', {
                defaultMovieTheater: searchMovieTheatersResult.data[0],
                moment: moment,
                subscription,
                useAdvancedScheduling: subscription?.settings.useAdvancedScheduling,
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
): chevre.factory.event.ISearchConditions<chevre.factory.eventType.Event> {
    const now = new Date();
    const format = req.query.format;
    const date = req.query.date;
    const days: number = Number(format);
    // const locationId = req.query.theater;
    const screeningRoomBranchCode = req.query.screen;
    const onlyEventScheduled: boolean = req.query.onlyEventScheduled === '1';
    const idEq = req.query.id?.$eq;
    const offersAvailable: boolean = req.query.offersAvailable === '1';
    const offersValid: boolean = req.query.offersValid === '1';
    const availableAtOrFromId = req.query.availableAtOrFromId;
    const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;

    return {
        sort: { startDate: chevre.factory.sortType.Ascending },
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.Event,
        eventStatuses: (onlyEventScheduled) ? [chevre.factory.eventStatusType.EventScheduled] : undefined,
        id: { $in: (typeof idEq === 'string' && idEq.length > 0) ? [idEq] : undefined },
        inSessionFrom: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            .toDate(),
        inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            .add(days, 'day')
            .toDate(),
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
        },
        additionalProperty: {
            ...(typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
                : undefined
        }
    };

}
eventRouter.get(
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
            const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
            const searchConditions = createSearchConditions(req);

            if (format === 'table') {
                const limit = Number(req.query.limit);
                const page = Number(req.query.page);
                const { data } = await eventService.search<chevre.factory.eventType.Event>({
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
                        const additionalPropertyMatched =
                            (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                                ? event.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                                : undefined;
                        const makesOffer = event.offers?.seller?.makesOffer;

                        return {
                            ...event,
                            makesOfferCount:
                                (Array.isArray(makesOffer)) ? makesOffer.length : 0,
                            ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
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
                const events: chevre.factory.event.IEvent<chevre.factory.eventType.Event>[] = [];
                while (numData === limit) {
                    page += 1;
                    const searchEventsResult = await eventService.search<chevre.factory.eventType.Event>({
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
            console.error(err);
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message,
                    error: err.message
                });
        }
    }
);

/**
 * 作成token発行
 */
eventRouter.get(
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
eventRouter.post<ParamsDictionary>(
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
eventRouter.post(
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

            const searchEventsResult = await eventService.search<chevre.factory.eventType.Event>({
                limit: 100,
                page: 1,
                typeOf: chevre.factory.eventType.Event,
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
 * イベント詳細
 */
eventRouter.get(
    '/:eventId',
    async (req, res, next) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const event = await eventService.findById({ id: req.params.eventId });

            res.render('events/event/details', {
                event
            });
        } catch (err) {
            next(err);
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
eventRouter.post<ParamsDictionary>(
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
            if (!validatorResult.isEmpty()) {
                // 具体的なmessage
                const validationErrors = validatorResult.array();
                res.status(BAD_REQUEST)
                    .json({
                        message: `${validationErrors[0]?.param}:${validationErrors[0]?.msg}`,
                        error: { errors: validationErrors[0] }
                    });

                return;
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

eventRouter.put(
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

eventRouter.put(
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

eventRouter.put(
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

eventRouter.post(
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
                    typeOf: <any>chevre.factory.eventType.Event,
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

eventRouter.get(
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
            const event = await eventService.findById<chevre.factory.eventType.Event>({ id: req.params.id });
            // 興行からカタログを参照する(2022-09-02~)
            const eventServiceId = event.offers?.itemOffered?.id;
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

eventRouter.get(
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
            const event = await eventService.findById<chevre.factory.eventType.Event>({ id: req.params.id });
            const transportationId = event.offers?.itemOffered?.id;
            if (typeof transportationId !== 'string') {
                throw new chevre.factory.errors.NotFound('event.offers.itemOffered.id');
            }
            const transportation = <factory.product.IProduct>await productService.findById({ id: transportationId });

            res.json(transportation);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

eventRouter.get(
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
eventRouter.get(
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
            const event = await eventService.findById<chevre.factory.eventType.Event>({ id: req.params.id });
            const eventServiceId = event.offers?.itemOffered?.id;
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

eventRouter.get(
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

eventRouter.get(
    '/:id/aggregateOffer',
    async (req, res) => {
        const eventService = new chevre.service.Event({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const event = await eventService.findById<chevre.factory.eventType.Event>({ id: req.params.id });

            let offers: chevre.factory.event.event.IOfferWithAggregateReservation[] = [];
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
eventRouter.get(
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

eventRouter.get(
    '/:id/availableSeatOffers',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const event = await eventService.findById<chevre.factory.eventType.Event>({ id: req.params.id });

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
async function createEventFromBody(req: Request): Promise<chevre.factory.event.event.ICreateParams> {
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

    const screeningRoomBranchCode: string = req.body.screen;
    const { movieTheater } = await findPlacesFromBody(req)({ place: placeService });

    // const sellerId: string = req.body.seller;

    // プロダクト検索に変更(2022-11-05)
    const searchEventServicesResult = await productService.search({
        limit: 1,
        typeOf: { $eq: chevre.factory.product.ProductType.Transportation },
        id: { $eq: `${req.body.eventServiceId}` }
    });
    const transportation = <factory.product.IProduct | undefined>searchEventServicesResult.data.shift();
    if (transportation === undefined) {
        throw new Error('旅客が見つかりません');
    }
    if (typeof transportation.hasOfferCatalog?.id !== 'string') {
        throw new Error('旅客のカタログ設定が見つかりません');
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

    // let unacceptedPaymentMethod: string[] | undefined;

    // ムビチケ除外の場合は対応決済方法を追加
    // if (req.body.mvtkExcludeFlg === '1' || req.body.mvtkExcludeFlg === DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET) {
    //     if (!Array.isArray(unacceptedPaymentMethod)) {
    //         unacceptedPaymentMethod = [];
    //     }
    //     unacceptedPaymentMethod.push(DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET);
    // }

    const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
        ? Number(req.body.maximumAttendeeCapacity)
        : undefined;
    validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity);

    const offers = createOffers4event({
        availabilityEnds: salesEndDate,
        availabilityStarts: onlineDisplayStartDate,
        eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
        itemOffered: {
            id: String(transportation.id),
            serviceOutput: { reservationFor: { identifier: String(req.body.tripIdentifier) } }
        },
        validFrom: salesStartDate,
        validThrough: salesEndDate,
        // seller: { id: sellerId },
        // unacceptedPaymentMethod,
        reservedSeatsAvailable: req.body.reservedSeatsAvailable === '1',
        customerMembers,
        endDate,
        startDate,
        isNew: false,
        makesOffers4update: req.body.makesOffer,
        availableChannel: {
            serviceLocation: {
                branchCode: screeningRoomBranchCode,
                containedInPlace: { id: movieTheater.id }
            }
        }
    });

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.eventType.Event,
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
async function createMultipleEventFromBody(req: Request): Promise<chevre.factory.event.event.ICreateParams[]> {
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

    const screeningRoomBranchCode: string = req.body.screen;

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
    // const mvtkExcludeFlgs: string[] = req.body.mvtkExcludeFlgData;
    const timeData: { doorTime: string; startTime: string; endTime: string; endDayRelative: string }[] = req.body.timeData;

    // 興行IDとして受け取る(2022-11-05~)
    const searchEventServicesResult = await productService.search({
        limit: 100,
        page: 1,
        typeOf: { $eq: chevre.factory.product.ProductType.Transportation },
        id: { $in: eventServiceIds }
    });
    const transportations = <factory.product.IProduct[]>searchEventServicesResult.data;

    const attributes: chevre.factory.event.event.ICreateParams[] = [];
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

                // let unacceptedPaymentMethod: string[] | undefined;

                // ムビチケ除外の場合は対応決済方法を追加
                // if (mvtkExcludeFlgs[i] === '1' || mvtkExcludeFlgs[i] === DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET) {
                //     if (!Array.isArray(unacceptedPaymentMethod)) {
                //         unacceptedPaymentMethod = [];
                //     }
                //     unacceptedPaymentMethod.push(DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET);
                // }

                const transportation = transportations.find((p) => p.id === `${eventServiceIds[i]}`);
                if (transportation === undefined) {
                    throw new Error('旅客が見つかりません');
                }
                if (typeof transportation.hasOfferCatalog?.id !== 'string') {
                    throw new Error('旅客のカタログ設定が見つかりません');
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

                const offers = createOffers4event({
                    availabilityEnds: salesEndDate,
                    availabilityStarts: onlineDisplayStartDate,
                    eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
                    itemOffered: {
                        id: String(transportation.id),
                        serviceOutput: { reservationFor: { identifier: String(req.body.tripIdentifier) } }
                    },
                    validFrom: salesStartDate,
                    validThrough: salesEndDate,
                    availabilityEndsOnPOS,
                    availabilityStartsOnPOS,
                    validFromOnPOS,
                    validThroughOnPOS,
                    // seller: { id: sellerId },
                    // unacceptedPaymentMethod,
                    reservedSeatsAvailable: req.body.reservedSeatsAvailable === '1',
                    customerMembers,
                    endDate,
                    startDate: eventStartDate,
                    isNew: true,
                    makesOffers4update: [],
                    availableChannel: {
                        serviceLocation: {
                            branchCode: screeningRoomBranchCode,
                            containedInPlace: { id: movieTheater.id }
                        }
                    }
                });

                attributes.push({
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.eventType.Event,
                    doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                        .toDate(),
                    startDate: eventStartDate,
                    endDate,
                    location: {
                        branchCode: screeningRoomBranchCode,
                        ...(typeof maximumAttendeeCapacity === 'number')
                            ? { maximumAttendeeCapacity }
                            : undefined
                    },
                    eventStatus: chevre.factory.eventStatusType.EventScheduled,
                    offers: offers
                });
            });
        }
    }

    return attributes;
}

/**
 * 新規登録バリデーション
 */
function addValidation() {
    return [
        body('tripIdentifier', '施設コンテンツが未選択です')
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
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')

    ];
}
/**
 * 編集バリデーション
 */
function updateValidation() {
    return [
        body('tripIdentifier', 'トリップが未選択です')
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
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}

export { eventRouter };
