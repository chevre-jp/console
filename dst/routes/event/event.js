"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRouter = void 0;
/**
 * イベントルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const offers_1 = require("../offers");
const TimelineFactory = require("../../factory/timeline");
const factory_1 = require("./factory");
const validateCsrfToken_1 = require("../../middlewares/validateCsrfToken");
// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions = require('../../../subscriptions.json');
const debug = createDebug('chevre-backend:routes');
const eventRouter = (0, express_1.Router)();
exports.eventRouter = eventRouter;
eventRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // timestampパラメータ必須
        const timestamp = typeof req.query.timestamp;
        if (typeof timestamp !== 'string' || timestamp.length === 0) {
            throw new Error('invalid request');
        }
        const itemOfferedTypeOf = (_a = req.query.itemOffered) === null || _a === void 0 ? void 0 : _a.typeOf;
        if (typeof itemOfferedTypeOf !== 'string' || itemOfferedTypeOf.length === 0) {
            res.redirect(`/projects/${req.project.id}/events/screeningEvent?timestamp=${timestamp}&itemOffered[typeOf]=${sdk_1.chevre.factory.product.ProductType.EventService}`);
            return;
        }
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        // サブスクリプション決定
        const chevreProject = yield projectService.findById({ id: req.project.id });
        let subscriptionIdentifier = (_b = chevreProject.subscription) === null || _b === void 0 ? void 0 : _b.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
            limit: 1,
            project: { id: { $eq: req.project.id } }
        });
        if (searchMovieTheatersResult.data.length === 0) {
            throw new Error('施設が見つかりません');
        }
        const applications = yield (0, offers_1.searchApplications)(req);
        res.render('events/event/index', {
            defaultMovieTheater: searchMovieTheatersResult.data[0],
            moment: moment,
            subscription,
            useAdvancedScheduling: subscription === null || subscription === void 0 ? void 0 : subscription.settings.useAdvancedScheduling,
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
    }
    catch (err) {
        next(err);
    }
}));
/**
 * イベントステータス管理
 */
eventRouter.get('/eventStatuses', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        // サブスクリプション決定
        const chevreProject = yield projectService.findById({ id: req.project.id });
        let subscriptionIdentifier = (_c = chevreProject.subscription) === null || _c === void 0 ? void 0 : _c.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
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
            useAdvancedScheduling: subscription === null || subscription === void 0 ? void 0 : subscription.settings.useAdvancedScheduling,
            EventStatusType: sdk_1.chevre.factory.eventStatusType
        });
    }
    catch (err) {
        next(err);
    }
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(req) {
    var _a, _b, _c, _d, _e, _f;
    const now = new Date();
    const format = req.query.format;
    const date = req.query.date;
    const days = Number(format);
    // const locationId = req.query.theater;
    const screeningRoomBranchCode = req.query.screen;
    const onlyEventScheduled = req.query.onlyEventScheduled === '1';
    const idEq = (_a = req.query.id) === null || _a === void 0 ? void 0 : _a.$eq;
    const offersAvailable = req.query.offersAvailable === '1';
    const offersValid = req.query.offersValid === '1';
    const availableAtOrFromId = req.query.availableAtOrFromId;
    const additionalPropertyElemMatchNameEq = (_d = (_c = (_b = req.query.additionalProperty) === null || _b === void 0 ? void 0 : _b.$elemMatch) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.$eq;
    return {
        sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
        project: { id: { $eq: req.project.id } },
        typeOf: sdk_1.chevre.factory.eventType.Event,
        eventStatuses: (onlyEventScheduled) ? [sdk_1.chevre.factory.eventStatusType.EventScheduled] : undefined,
        id: { $in: (typeof idEq === 'string' && idEq.length > 0) ? [idEq] : undefined },
        inSessionFrom: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            .toDate(),
        inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            .add(days, 'day')
            .toDate(),
        offers: {
            seller: {
                makesOffer: {
                    $elemMatch: Object.assign({}, (typeof availableAtOrFromId === 'string')
                        ? Object.assign(Object.assign({ 'availableAtOrFrom.id': { $eq: availableAtOrFromId } }, (offersAvailable)
                            ? {
                                availabilityEnds: { $gte: now },
                                availabilityStarts: { $lte: now }
                            }
                            : undefined), (offersValid)
                            ? {
                                validThrough: { $gte: now },
                                validFrom: { $lte: now }
                            }
                            : undefined) : undefined)
                }
            },
            itemOffered: {
                id: {
                    $in: (typeof ((_e = req.query.itemOffered) === null || _e === void 0 ? void 0 : _e.id) === 'string' && req.query.itemOffered.id.length > 0)
                        ? [req.query.itemOffered.id]
                        : undefined
                },
                serviceOutput: {
                    reservedTicket: {
                        ticketedSeat: {
                            // 座席指定有のみの検索の場合
                            typeOfs: req.query.onlyReservedSeatsAvailable === '1'
                                ? [sdk_1.chevre.factory.placeType.Seat]
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
                $eq: (typeof ((_f = req.query.hasOfferCatalog) === null || _f === void 0 ? void 0 : _f.id) === 'string' && req.query.hasOfferCatalog.id.length > 0)
                    ? req.query.hasOfferCatalog.id
                    : undefined
            }
        },
        additionalProperty: Object.assign({}, (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
            ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
            : undefined)
    };
}
eventRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e, _f;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const format = req.query.format;
        const date = req.query.date;
        const locationId = req.query.theater;
        const screeningRoomBranchCode = req.query.screen;
        const additionalPropertyElemMatchNameEq = (_f = (_e = (_d = req.query.additionalProperty) === null || _d === void 0 ? void 0 : _d.$elemMatch) === null || _e === void 0 ? void 0 : _e.name) === null || _f === void 0 ? void 0 : _f.$eq;
        const searchConditions = createSearchConditions(req);
        if (format === 'table') {
            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = yield eventService.search(Object.assign(Object.assign({}, searchConditions), { limit: limit, page: page, inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate() }));
            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((event) => {
                    var _a, _b, _c;
                    const additionalPropertyMatched = (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                        ? (_a = event.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === additionalPropertyElemMatchNameEq)
                        : undefined;
                    const makesOffer = (_c = (_b = event.offers) === null || _b === void 0 ? void 0 : _b.seller) === null || _c === void 0 ? void 0 : _c.makesOffer;
                    return Object.assign(Object.assign(Object.assign({}, event), { makesOfferCount: (Array.isArray(makesOffer)) ? makesOffer.length : 0 }), (additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined);
                })
            });
        }
        else {
            const searchScreeningRoomsResult = yield placeService.searchScreeningRooms({
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
            let numData = limit;
            const events = [];
            while (numData === limit) {
                page += 1;
                const searchEventsResult = yield eventService.search(Object.assign(Object.assign({}, searchConditions), { limit: limit, page: page }));
                numData = searchEventsResult.data.length;
                events.push(...searchEventsResult.data);
            }
            res.json({
                performances: events,
                screens: searchScreeningRoomsResult.data
            });
        }
    }
    catch (err) {
        console.error(err);
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: err.message,
            error: err.message
        });
    }
}));
/**
 * 作成token発行
 */
eventRouter.get('/new', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokens = new Tokens();
        const csrfSecret = yield tokens.secret();
        const csrfToken = tokens.create(csrfSecret);
        req.session.csrfSecret = {
            value: csrfSecret,
            createDate: new Date()
        };
        res.json({ token: csrfToken });
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json(error);
    }
}));
// tslint:disable-next-line:use-default-type-parameter
eventRouter.post('/new', validateCsrfToken_1.validateCsrfToken, ...addValidation(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const validatorResult = (0, express_validator_1.validationResult)(req);
        // errors = validatorResult.mapped();
        // const validations = req.validationErrors(true);
        if (!validatorResult.isEmpty()) {
            throw new Error('Invalid');
        }
        debug('saving screening event...', req.body);
        const attributes = yield createMultipleEventFromBody(req);
        const events = yield eventService.create(attributes);
        debug(events.length, 'events created', events.map((e) => e.id));
        // tslint:disable-next-line:no-dynamic-delete
        delete req.session.csrfSecret;
        res.json({
            error: undefined,
            events
        });
    }
    catch (err) {
        debug('regist error', err);
        const obj = {
            message: err.message,
            error: err.message
        };
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json(obj);
    }
}));
/**
 * 複数イベントステータス更新
 */
eventRouter.post('/updateStatuses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // パフォーマンスIDリストをjson形式で受け取る
        const performanceIds = req.body.performanceIds;
        if (!Array.isArray(performanceIds)) {
            throw new Error('システムエラーが発生しました。ご不便をおかけして申し訳ありませんがしばらく経ってから再度お試しください。');
        }
        const evStatus = req.body.evStatus;
        const notice = req.body.notice;
        debug('updating performances...', performanceIds, evStatus, notice);
        // 通知対象注文情報取得
        const targetOrders = yield getTargetOrdersForNotification(req, performanceIds);
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchEventsResult = yield eventService.search({
            limit: 100,
            page: 1,
            typeOf: sdk_1.chevre.factory.eventType.Event,
            id: { $in: performanceIds }
        });
        const updatingEvents = searchEventsResult.data;
        // イベント中止メールテンプレートを検索
        const emailMessageService = new sdk_1.chevre.service.EmailMessage({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchEmailMessagesResult = yield emailMessageService.search({
            limit: 1,
            page: 1,
            about: { identifier: { $eq: sdk_1.chevre.factory.creativeWork.message.email.AboutIdentifier.OnEventStatusChanged } }
        });
        const emailMessageOnCanceled = searchEmailMessagesResult.data.shift();
        if (emailMessageOnCanceled === undefined) {
            throw new Error('Eメールメッセージテンプレートが見つかりません');
        }
        for (const updatingEvent of updatingEvents) {
            const performanceId = updatingEvent.id;
            let sendEmailMessageParams = [];
            // 運行停止の場合、メール送信指定
            if (evStatus === sdk_1.chevre.factory.eventStatusType.EventCancelled) {
                const targetOrders4performance = targetOrders
                    .filter((o) => {
                    return Array.isArray(o.acceptedOffers)
                        && o.acceptedOffers.some((offer) => {
                            const reservation = offer.itemOffered;
                            return reservation.typeOf === sdk_1.chevre.factory.reservationType.EventReservation
                                && reservation.reservationFor.id === performanceId;
                        });
                });
                sendEmailMessageParams = yield (0, factory_1.createEmails)(targetOrders4performance, notice, emailMessageOnCanceled);
            }
            // イベントステータスに反映
            yield eventService.updatePartially({
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
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json(error);
    }
}));
/**
 * シンプルに、イベントに対するReturnedではない注文を全て対象にする
 */
function getTargetOrdersForNotification(req, performanceIds) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const orderService = new sdk_1.chevre.service.Order({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // 全注文検索
        const orders = [];
        if (performanceIds.length > 0) {
            const limit = 10;
            let page = 0;
            let numData = limit;
            while (numData === limit) {
                page += 1;
                const searchOrdersResult = yield orderService.search({
                    limit: limit,
                    page: page,
                    project: { id: { $eq: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id } },
                    acceptedOffers: {
                        itemOffered: {
                            // アイテムが予約
                            typeOf: { $in: [sdk_1.chevre.factory.reservationType.EventReservation] },
                            // 予約対象イベントがperformanceIds
                            reservationFor: { ids: performanceIds }
                        }
                    },
                    // 返品済は除く
                    orderStatuses: [sdk_1.chevre.factory.orderStatus.OrderDelivered, sdk_1.chevre.factory.orderStatus.OrderProcessing]
                });
                numData = searchOrdersResult.data.length;
                orders.push(...searchOrdersResult.data);
            }
        }
        return orders;
    });
}
/**
 * イベント詳細
 */
eventRouter.get('/:eventId', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.eventId });
        res.render('events/event/details', {
            event
        });
    }
    catch (err) {
        next(err);
    }
}));
// tslint:disable-next-line:use-default-type-parameter
eventRouter.post('/:eventId/update', ...updateValidation(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h;
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const validatorResult = (0, express_validator_1.validationResult)(req);
        if (!validatorResult.isEmpty()) {
            // 具体的なmessage
            const validationErrors = validatorResult.array();
            res.status(http_status_1.BAD_REQUEST)
                .json({
                message: `${(_g = validationErrors[0]) === null || _g === void 0 ? void 0 : _g.param}:${(_h = validationErrors[0]) === null || _h === void 0 ? void 0 : _h.msg}`,
                error: { errors: validationErrors[0] }
            });
            return;
        }
        const attributes = yield createEventFromBody(req);
        yield eventService.update({
            id: req.params.eventId,
            attributes: attributes
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: err.message,
            error: err
        });
    }
}));
eventRouter.put('/:eventId/cancel', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.eventId });
        if (moment(event.startDate)
            .tz('Asia/Tokyo')
            .isSameOrAfter(moment()
            .tz('Asia/Tokyo'), 'day')) {
            yield eventService.updatePartially({
                id: event.id,
                attributes: {
                    typeOf: event.typeOf,
                    eventStatus: sdk_1.chevre.factory.eventStatusType.EventCancelled,
                    onUpdated: {}
                }
            });
            res.status(http_status_1.NO_CONTENT)
                .end();
        }
        else {
            throw new Error('イベント開始日時が不適切です');
        }
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            error: err.message
        });
    }
}));
eventRouter.put('/:eventId/postpone', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.eventId });
        yield eventService.updatePartially({
            id: event.id,
            attributes: {
                typeOf: event.typeOf,
                eventStatus: sdk_1.chevre.factory.eventStatusType.EventPostponed,
                onUpdated: {}
            }
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            error: err.message
        });
    }
}));
eventRouter.put('/:eventId/reschedule', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.eventId });
        yield eventService.updatePartially({
            id: event.id,
            attributes: {
                typeOf: event.typeOf,
                eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled,
                onUpdated: {}
            }
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            error: err.message
        });
    }
}));
eventRouter.post('/:eventId/aggregateReservation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const taskAttributes = {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            name: sdk_1.chevre.factory.taskName.AggregateScreeningEvent,
            status: sdk_1.chevre.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 1,
            numberOfTried: 0,
            executionResults: [],
            data: {
                typeOf: sdk_1.chevre.factory.eventType.Event,
                id: req.params.eventId
            }
        };
        const task = yield taskService.create(taskAttributes);
        res.status(http_status_1.CREATED)
            .json(task);
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json(err);
    }
}));
eventRouter.get('/:id/hasOfferCatalog', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k, _l;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const event = yield eventService.findById({ id: req.params.id });
        // 興行からカタログを参照する(2022-09-02~)
        const eventServiceId = (_k = (_j = event.offers) === null || _j === void 0 ? void 0 : _j.itemOffered) === null || _k === void 0 ? void 0 : _k.id;
        if (typeof eventServiceId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const eventServiceProduct = yield productService.findById({ id: eventServiceId });
        const offerCatalogId = (_l = eventServiceProduct.hasOfferCatalog) === null || _l === void 0 ? void 0 : _l.id;
        if (typeof offerCatalogId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('product.hasOfferCatalog.id');
        }
        const offerCatalog = yield offerCatalogService.findById({ id: offerCatalogId });
        res.json(offerCatalog);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
eventRouter.get('/:id/itemOffered', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _m, _o;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const event = yield eventService.findById({ id: req.params.id });
        const transportationId = (_o = (_m = event.offers) === null || _m === void 0 ? void 0 : _m.itemOffered) === null || _o === void 0 ? void 0 : _o.id;
        if (typeof transportationId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const transportation = yield productService.findById({ id: transportationId });
        res.json(transportation);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
eventRouter.get('/:id/offers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const offers = yield eventService.searchTicketOffers({
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(Number(req.query.limit), 100) : undefined,
            page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : undefined,
            id: req.params.id
        });
        res.json(offers);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
/**
 * カタログ編集へリダイレクト
 */
eventRouter.get('/:id/showCatalog', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _p, _q, _r;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const event = yield eventService.findById({ id: req.params.id });
        const eventServiceId = (_q = (_p = event.offers) === null || _p === void 0 ? void 0 : _p.itemOffered) === null || _q === void 0 ? void 0 : _q.id;
        if (typeof eventServiceId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const eventServiceProduct = yield productService.findById({ id: eventServiceId });
        const offerCatalogId = (_r = eventServiceProduct.hasOfferCatalog) === null || _r === void 0 ? void 0 : _r.id;
        if (typeof offerCatalogId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('product.hasOfferCatalog.id');
        }
        const redirect = `/projects/${req.project.id}/offerCatalogs/${offerCatalogId}/update`;
        res.redirect(redirect);
    }
    catch (error) {
        next(error);
    }
}));
eventRouter.get('/:id/updateActions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const actionService = new sdk_1.chevre.service.Action({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    // アクション検索
    const updateActions = [];
    try {
        const searchSendActionsResult = yield actionService.search({
            limit: 100,
            sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
            typeOf: { $eq: sdk_1.chevre.factory.actionType.UpdateAction },
            object: {
                id: { $eq: req.params.id }
            }
        });
        updateActions.push(...searchSendActionsResult.data);
    }
    catch (error) {
        // no op
    }
    res.json(updateActions.map((a) => {
        return Object.assign(Object.assign({}, a), { timeline: TimelineFactory.createFromAction({
                project: { id: req.project.id },
                action: a
            }) });
    }));
}));
eventRouter.get('/:id/aggregateOffer', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _s;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const event = yield eventService.findById({ id: req.params.id });
        let offers = [];
        const offerWithAggregateReservationByEvent = (_s = event.aggregateOffer) === null || _s === void 0 ? void 0 : _s.offers;
        if (Array.isArray(offerWithAggregateReservationByEvent)) {
            offers = offerWithAggregateReservationByEvent;
        }
        res.json(offers);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
/**
 * イベントの注文検索
 */
eventRouter.get('/:id/orders', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderService = new sdk_1.chevre.service.Order({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOrdersResult = yield orderService.search({
            limit: req.query.limit,
            page: req.query.page,
            sort: { orderDate: sdk_1.chevre.factory.sortType.Descending },
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
    }
    catch (error) {
        next(error);
    }
}));
eventRouter.get('/:id/availableSeatOffers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _t, _u, _v, _w, _x, _y;
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.id });
        const { data } = yield eventService.searchSeats({
            id: event.id,
            limit: 100,
            page: 1,
            branchCode: {
                $regex: (typeof ((_u = (_t = req.query) === null || _t === void 0 ? void 0 : _t.branchCode) === null || _u === void 0 ? void 0 : _u.$eq) === 'string'
                    && ((_w = (_v = req.query) === null || _v === void 0 ? void 0 : _v.branchCode) === null || _w === void 0 ? void 0 : _w.$eq.length) > 0)
                    ? (_y = (_x = req.query) === null || _x === void 0 ? void 0 : _x.branchCode) === null || _y === void 0 ? void 0 : _y.$eq
                    : undefined
            }
        });
        res.json(data);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
function findPlacesFromBody(req) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const movieTheaterBranchCode = String(req.body.theater);
        const searchMovieTheatersResult = yield repos.place.searchMovieTheaters({
            limit: 1,
            id: { $eq: movieTheaterBranchCode }
        });
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new Error('施設が見つかりません');
        }
        return { movieTheater };
    });
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createEventFromBody(req) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        // サブスクリプション決定
        const chevreProject = yield projectService.findById({ id: req.project.id });
        let subscriptionIdentifier = (_a = chevreProject.subscription) === null || _a === void 0 ? void 0 : _a.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const customerMembers = yield (0, offers_1.searchApplications)(req);
        const screeningRoomBranchCode = req.body.screen;
        const { movieTheater } = yield findPlacesFromBody(req)({ place: placeService });
        // const sellerId: string = req.body.seller;
        // プロダクト検索に変更(2022-11-05)
        const searchEventServicesResult = yield productService.search({
            limit: 1,
            typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.Transportation },
            id: { $eq: `${req.body.eventServiceId}` }
        });
        const transportation = searchEventServicesResult.data.shift();
        if (transportation === undefined) {
            throw new Error('旅客が見つかりません');
        }
        if (typeof ((_b = transportation.hasOfferCatalog) === null || _b === void 0 ? void 0 : _b.id) !== 'string') {
            throw new Error('旅客のカタログ設定が見つかりません');
        }
        let offersValidAfterStart;
        if (req.body.endSaleTimeAfterScreening !== undefined && req.body.endSaleTimeAfterScreening !== '') {
            offersValidAfterStart = Number(req.body.endSaleTimeAfterScreening);
        }
        else if (typeof ((_d = (_c = movieTheater.offers) === null || _c === void 0 ? void 0 : _c.availabilityEndsGraceTime) === null || _d === void 0 ? void 0 : _d.value) === 'number') {
            // tslint:disable-next-line:no-magic-numbers
            offersValidAfterStart = Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60);
        }
        else {
            offersValidAfterStart = factory_1.DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES;
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
        const onlineDisplayStartDate = (String(req.body.onlineDisplayType) === factory_1.OnlineDisplayType.Relative)
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
        (0, factory_1.validateMaximumAttendeeCapacity)(subscription, maximumAttendeeCapacity);
        const offers = (0, factory_1.createOffers4event)({
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
            typeOf: sdk_1.chevre.factory.eventType.Event,
            doorTime: doorTime,
            startDate,
            endDate,
            // 最適化(2022-10-01~)
            // workPerformed: superEvent.workPerformed,
            // 最適化(2022-10-01~)
            location: Object.assign({ branchCode: screeningRoomBranchCode }, (typeof maximumAttendeeCapacity === 'number')
                ? { maximumAttendeeCapacity }
                : undefined),
            // 最適化(2022-10-01~)
            // name: superEvent.name,
            eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled,
            offers: offers,
            // 最適化(2022-10-01~)
            // checkInCount: undefined,
            // attendeeCount: undefined,
            additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : []
        };
    });
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
function createMultipleEventFromBody(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        // サブスクリプション決定
        const chevreProject = yield projectService.findById({ id: req.project.id });
        let subscriptionIdentifier = (_a = chevreProject.subscription) === null || _a === void 0 ? void 0 : _a.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const customerMembers = yield (0, offers_1.searchApplications)(req);
        const screeningRoomBranchCode = req.body.screen;
        const { movieTheater } = yield findPlacesFromBody(req)({ place: placeService });
        const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
            ? Number(req.body.maximumAttendeeCapacity)
            : undefined;
        (0, factory_1.validateMaximumAttendeeCapacity)(subscription, maximumAttendeeCapacity);
        const startDate = moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const toDate = moment(`${req.body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const weekDays = req.body.weekDayData;
        // 現時点でカタログIDとして受け取っている
        const eventServiceIds = req.body.eventServiceIds;
        // const mvtkExcludeFlgs: string[] = req.body.mvtkExcludeFlgData;
        const timeData = req.body.timeData;
        // 興行IDとして受け取る(2022-11-05~)
        const searchEventServicesResult = yield productService.search({
            limit: 100,
            page: 1,
            typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.Transportation },
            id: { $in: eventServiceIds }
        });
        const transportations = searchEventServicesResult.data;
        const attributes = [];
        for (let date = startDate; date <= toDate; date = date.add(1, 'day')) {
            const formattedDate = date.format('YYYY/MM/DD');
            const day = date.get('day')
                .toString();
            if (weekDays.indexOf(day) >= 0) {
                // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
                timeData.forEach((data, i) => {
                    var _a, _b, _c;
                    // tslint:disable-next-line:max-line-length
                    const offersValidAfterStart = (req.body.endSaleTimeAfterScreening !== undefined && req.body.endSaleTimeAfterScreening !== '')
                        ? Number(req.body.endSaleTimeAfterScreening)
                        : factory_1.DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES;
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
                    let salesStartDate;
                    switch (String(req.body.saleStartDateType)) {
                        case factory_1.DateTimeSettingType.Absolute:
                            salesStartDate = moment(`${String(req.body.saleStartDate)}T${req.body.saleStartTime}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
                                .toDate();
                            break;
                        case factory_1.DateTimeSettingType.Relative:
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
                    let salesEndDate;
                    switch (String(req.body.saleEndDateType)) {
                        case factory_1.DateTimeSettingType.Absolute:
                            salesEndDate = moment(`${String(req.body.saleEndDate)}T${req.body.saleEndTime}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
                                .toDate();
                            break;
                        case factory_1.DateTimeSettingType.Relative:
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
                    const onlineDisplayStartDate = (String(req.body.onlineDisplayType) === factory_1.OnlineDisplayType.Relative)
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
                    if (typeof ((_a = transportation.hasOfferCatalog) === null || _a === void 0 ? void 0 : _a.id) !== 'string') {
                        throw new Error('旅客のカタログ設定が見つかりません');
                    }
                    const endDate = moment(`${formattedEndDate}T${data.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                        .toDate();
                    // POSの興行初期設定を施設から取得(2022-11-24~)
                    if (typeof ((_b = movieTheater.offers) === null || _b === void 0 ? void 0 : _b.availabilityStartsGraceTimeOnPOS.value) !== 'number'
                        || typeof ((_c = movieTheater.offers) === null || _c === void 0 ? void 0 : _c.availabilityEndsGraceTimeOnPOS.value) !== 'number') {
                        throw new Error('施設のPOS興行初期設定が見つかりません');
                    }
                    const validFromOnPOS = moment(eventStartDate)
                        .add(movieTheater.offers.availabilityStartsGraceTimeOnPOS.value, 'days')
                        .toDate();
                    const validThroughOnPOS = moment(eventStartDate)
                        .add(movieTheater.offers.availabilityEndsGraceTimeOnPOS.value, 'seconds')
                        .toDate();
                    const availabilityEndsOnPOS = validThroughOnPOS;
                    const availabilityStartsOnPOS = validFromOnPOS;
                    const offers = (0, factory_1.createOffers4event)({
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
                        typeOf: sdk_1.chevre.factory.eventType.Event,
                        doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(),
                        startDate: eventStartDate,
                        endDate,
                        location: Object.assign({ branchCode: screeningRoomBranchCode }, (typeof maximumAttendeeCapacity === 'number')
                            ? { maximumAttendeeCapacity }
                            : undefined),
                        eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled,
                        offers: offers
                    });
                });
            }
        }
        return attributes;
    });
}
/**
 * 新規登録バリデーション
 */
function addValidation() {
    return [
        (0, express_validator_1.body)('tripIdentifier', '施設コンテンツが未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('startDate', '開催日が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('toDate', '開催日が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('weekDayData', '曜日が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('screen', 'ルームが未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('theater', '施設が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('timeData', '時間情報が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('eventServiceIds', '興行が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('maxSeatNumber')
            .not()
            .isEmpty()
            .isInt({ min: 0, max: 50 })
            .toInt()
            .withMessage(() => '0~50の間で入力してください'),
        (0, express_validator_1.body)([
            'additionalProperty.*.name'
        ])
            .optional()
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .if((value) => String(value).length > 0)
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}
/**
 * 編集バリデーション
 */
function updateValidation() {
    return [
        (0, express_validator_1.body)('tripIdentifier', 'トリップが未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('day', '開催日が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('doorTime', '開場時刻が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('startTime', '開始時刻が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('endTime', '終了時刻が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('screen', 'ルームが未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('eventServiceId', '興行が未選択です')
            .notEmpty(),
        (0, express_validator_1.body)('maxSeatNumber')
            .not()
            .isEmpty()
            .isInt({ min: 0, max: 50 })
            .toInt()
            .withMessage(() => '0~50の間で入力してください'),
        (0, express_validator_1.body)([
            'additionalProperty.*.name'
        ])
            .optional()
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .if((value) => String(value).length > 0)
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}
