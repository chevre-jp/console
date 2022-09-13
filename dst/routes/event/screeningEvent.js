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
exports.screeningEventRouter = void 0;
/**
 * イベント管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const pug = require("pug");
const screeningEventSeries_1 = require("./screeningEventSeries");
const productType_1 = require("../../factory/productType");
const TimelineFactory = require("../../factory/timeline");
const validateCsrfToken_1 = require("../../middlewares/validateCsrfToken");
// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions = require('../../../subscriptions.json');
const DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;
var DateTimeSettingType;
(function (DateTimeSettingType) {
    DateTimeSettingType["Default"] = "default";
    DateTimeSettingType["Absolute"] = "absolute";
    DateTimeSettingType["Relative"] = "relative";
})(DateTimeSettingType || (DateTimeSettingType = {}));
var OnlineDisplayType;
(function (OnlineDisplayType) {
    OnlineDisplayType["Absolute"] = "absolute";
    OnlineDisplayType["Relative"] = "relative";
})(OnlineDisplayType || (OnlineDisplayType = {}));
const debug = createDebug('chevre-backend:routes');
const screeningEventRouter = (0, express_1.Router)();
exports.screeningEventRouter = screeningEventRouter;
screeningEventRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // timestampパラメータ必須
        if (typeof req.query.timestamp !== 'string' || req.query.timestamp.length === 0) {
            throw new Error('invalid request');
        }
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
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
            limit: 1,
            project: { id: { $eq: req.project.id } }
        });
        if (searchMovieTheatersResult.data.length === 0) {
            throw new Error('施設が見つかりません');
        }
        // 決済方法にムビチケがあるかどうかを確認
        const searchPaymentServicesResult = yield productService.search({
            typeOf: { $eq: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket },
            serviceType: { codeValue: { $eq: screeningEventSeries_1.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET } }
        });
        debug('searchPaymentServicesResult:', searchPaymentServicesResult);
        res.render('events/screeningEvent/index', {
            defaultMovieTheater: searchMovieTheatersResult.data[0],
            moment: moment,
            subscription,
            useAdvancedScheduling: subscription === null || subscription === void 0 ? void 0 : subscription.settings.useAdvancedScheduling,
            movieTicketPaymentService: searchPaymentServicesResult.data.shift()
        });
    }
    catch (err) {
        next(err);
    }
}));
/**
 * イベントステータス管理
 */
screeningEventRouter.get('/eventStatuses', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
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
        // 決済方法にムビチケがあるかどうかを確認
        const searchPaymentServicesResult = yield productService.search({
            typeOf: { $eq: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket },
            serviceType: { codeValue: { $eq: screeningEventSeries_1.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET } }
        });
        debug('searchPaymentServicesResult:', searchPaymentServicesResult);
        res.render('events/screeningEvent/eventStatuses', {
            defaultMovieTheater: searchMovieTheatersResult.data[0],
            moment: moment,
            subscription,
            useAdvancedScheduling: subscription === null || subscription === void 0 ? void 0 : subscription.settings.useAdvancedScheduling,
            movieTicketPaymentService: searchPaymentServicesResult.data.shift(),
            EventStatusType: sdk_1.chevre.factory.eventStatusType
        });
    }
    catch (err) {
        next(err);
    }
}));
function createSearchConditions(req) {
    var _a, _b, _c, _d;
    const now = new Date();
    const format = req.query.format;
    const date = req.query.date;
    const days = Number(format);
    const locationId = req.query.theater;
    const screeningRoomBranchCode = req.query.screen;
    const superEventWorkPerformedIdentifierEq = (_b = (_a = req.query.superEvent) === null || _a === void 0 ? void 0 : _a.workPerformed) === null || _b === void 0 ? void 0 : _b.identifier;
    const onlyEventScheduled = req.query.onlyEventScheduled === '1';
    return {
        sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
        project: { id: { $eq: req.project.id } },
        typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
        eventStatuses: (onlyEventScheduled) ? [sdk_1.chevre.factory.eventStatusType.EventScheduled] : undefined,
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
                id: {
                    $in: (typeof ((_c = req.query.itemOffered) === null || _c === void 0 ? void 0 : _c.id) === 'string' && req.query.itemOffered.id.length > 0)
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
                $eq: (typeof ((_d = req.query.hasOfferCatalog) === null || _d === void 0 ? void 0 : _d.id) === 'string' && req.query.hasOfferCatalog.id.length > 0)
                    ? req.query.hasOfferCatalog.id
                    : undefined
            }
        }
    };
}
screeningEventRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                results: data
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
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: err.message,
            error: err.message
        });
    }
}));
screeningEventRouter.get('/searchScreeningEventSeries', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const searchResult = yield eventService.search({
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
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
    }
    catch (err) {
        debug('searchScreeningEvent error', err);
        res.json({
            error: err.message
        });
    }
}));
/**
 * 作成token発行
 */
screeningEventRouter.get('/new', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
screeningEventRouter.post('/new', validateCsrfToken_1.validateCsrfToken, ...addValidation(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            error: undefined
        });
    }
    catch (err) {
        debug('regist error', err);
        const obj = {
            message: err.message,
            error: err.message
        };
        if (err.code === http_status_1.BAD_REQUEST) {
            res.status(err.code)
                .json(obj);
        }
        else {
            res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
                .json(obj);
        }
    }
}));
/**
 * 複数イベントステータス更新
 */
screeningEventRouter.post('/updateStatuses', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
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
                sendEmailMessageParams = yield createEmails(targetOrders4performance, notice, emailMessageOnCanceled);
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
 * 運行・オンライン販売停止メール作成
 */
function createEmails(orders, notice, emailMessageOnCanceled) {
    return __awaiter(this, void 0, void 0, function* () {
        if (orders.length === 0) {
            return [];
        }
        return Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
            return createEmail(order, notice, emailMessageOnCanceled);
        })));
    });
}
/**
 * 運行・オンライン販売停止メール作成(1通)
 */
function createEmail(order, notice, emailMessageOnCanceled) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield new Promise((resolve, reject) => {
            pug.render(emailMessageOnCanceled.text, {
                moment,
                order,
                notice
            }, (err, message) => {
                if (err instanceof Error) {
                    reject(new sdk_1.chevre.factory.errors.Argument('emailTemplate', err.message));
                    return;
                }
                resolve(message);
            });
        });
        // メール作成
        const emailMessage = {
            typeOf: sdk_1.chevre.factory.creativeWorkType.EmailMessage,
            identifier: `updateOnlineStatus-${order.orderNumber}`,
            name: `updateOnlineStatus-${order.orderNumber}`,
            sender: {
                typeOf: order.seller.typeOf,
                name: emailMessageOnCanceled.sender.name,
                email: emailMessageOnCanceled.sender.email
            },
            toRecipient: {
                typeOf: order.customer.typeOf,
                name: order.customer.name,
                email: order.customer.email
            },
            about: {
                typeOf: 'Thing',
                identifier: emailMessageOnCanceled.about.identifier,
                name: emailMessageOnCanceled.about.name
            },
            text: content
        };
        const purpose = {
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
        const recipient = {
            id: order.customer.id,
            name: emailMessage.toRecipient.name,
            typeOf: order.customer.typeOf
        };
        return {
            typeOf: sdk_1.chevre.factory.actionType.SendAction,
            agent: order.project,
            object: emailMessage,
            project: { typeOf: order.project.typeOf, id: order.project.id },
            purpose: purpose,
            recipient
        };
    });
}
/**
 * イベント詳細
 */
screeningEventRouter.get('/:eventId', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.eventId });
        res.render('events/screeningEvent/details', {
            event
        });
    }
    catch (err) {
        next(err);
    }
}));
// tslint:disable-next-line:use-default-type-parameter
screeningEventRouter.post('/:eventId/update', ...updateValidation(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            throw new Error('不適切な項目があります');
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
        res.status(http_status_1.BAD_REQUEST)
            .json({
            message: err.message,
            error: err
        });
    }
}));
screeningEventRouter.put('/:eventId/cancel', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
screeningEventRouter.put('/:eventId/postpone', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
screeningEventRouter.put('/:eventId/reschedule', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
screeningEventRouter.post('/:eventId/aggregateReservation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
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
screeningEventRouter.get('/:id/hasOfferCatalog', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e;
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
        // const offerCatalogId = event.hasOfferCatalog?.id;
        const eventServiceId = (_d = (_c = event.offers) === null || _c === void 0 ? void 0 : _c.itemOffered) === null || _d === void 0 ? void 0 : _d.id;
        if (typeof eventServiceId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const eventServiceProduct = yield productService.findById({ id: eventServiceId });
        const offerCatalogId = (_e = eventServiceProduct.hasOfferCatalog) === null || _e === void 0 ? void 0 : _e.id;
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
screeningEventRouter.get('/:id/offers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const offers = yield eventService.searchTicketOffers({ id: req.params.id });
        res.json(offers);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
screeningEventRouter.get('/:id/updateActions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
screeningEventRouter.get('/:id/aggregateOffer', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const event = yield eventService.findById({ id: req.params.id });
        let offers = [];
        const offerWithAggregateReservationByEvent = (_f = event.aggregateOffer) === null || _f === void 0 ? void 0 : _f.offers;
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
screeningEventRouter.get('/:id/orders', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
screeningEventRouter.get('/:id/availableSeatOffers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k, _l, _m;
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
                $regex: (typeof ((_h = (_g = req.query) === null || _g === void 0 ? void 0 : _g.branchCode) === null || _h === void 0 ? void 0 : _h.$eq) === 'string'
                    && ((_k = (_j = req.query) === null || _j === void 0 ? void 0 : _j.branchCode) === null || _k === void 0 ? void 0 : _k.$eq.length) > 0)
                    ? (_m = (_l = req.query) === null || _l === void 0 ? void 0 : _l.branchCode) === null || _m === void 0 ? void 0 : _m.$eq
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
/**
 * COAイベントインポート
 */
screeningEventRouter.post('/importFromCOA', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
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
        const taskAttributes = [{
                project: { typeOf: req.project.typeOf, id: req.project.id },
                name: sdk_1.chevre.factory.taskName.ImportEventsFromCOA,
                status: sdk_1.chevre.factory.taskStatus.Ready,
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
        const tasks = yield Promise.all(taskAttributes.map((a) => __awaiter(void 0, void 0, void 0, function* () {
            return taskService.create(a);
        })));
        res.status(http_status_1.CREATED)
            .json(tasks);
    }
    catch (error) {
        next(error);
    }
}));
function minimizeSuperEvent(screeningEventSeries) {
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ typeOf: screeningEventSeries.typeOf, project: screeningEventSeries.project, id: screeningEventSeries.id, videoFormat: screeningEventSeries.videoFormat, soundFormat: screeningEventSeries.soundFormat, workPerformed: screeningEventSeries.workPerformed, location: screeningEventSeries.location, kanaName: screeningEventSeries.kanaName, name: screeningEventSeries.name }, (Array.isArray(screeningEventSeries.additionalProperty))
        ? { additionalProperty: screeningEventSeries.additionalProperty }
        : undefined), (screeningEventSeries.startDate !== undefined)
        ? { startDate: screeningEventSeries.startDate }
        : undefined), (screeningEventSeries.endDate !== undefined)
        ? { endDate: screeningEventSeries.endDate }
        : undefined), (screeningEventSeries.description !== undefined)
        ? { description: screeningEventSeries.description }
        : undefined), (screeningEventSeries.headline !== undefined)
        ? { headline: screeningEventSeries.headline }
        : undefined), (screeningEventSeries.dubLanguage !== undefined)
        ? { dubLanguage: screeningEventSeries.dubLanguage }
        : undefined), (screeningEventSeries.subtitleLanguage !== undefined)
        ? { subtitleLanguage: screeningEventSeries.subtitleLanguage }
        : undefined);
}
function createLocation(project, screeningRoom, maximumAttendeeCapacity) {
    return Object.assign({ project: { typeOf: sdk_1.chevre.factory.organizationType.Project, id: project.id }, typeOf: screeningRoom.typeOf, branchCode: screeningRoom.branchCode, name: screeningRoom.name, 
        // name: screeningRoom.name === undefined
        //     ? { en: '', ja: '', kr: '' }
        //     : <chevre.factory.multilingualString>screeningRoom.name,
        // alternateName: <chevre.factory.multilingualString>screeningRoom.alternateName,
        address: screeningRoom.address }, (typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined);
}
function createOffers(params) {
    var _a;
    const serviceOutput = (params.reservedSeatsAvailable)
        ? {
            typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
            reservedTicket: {
                typeOf: 'Ticket',
                ticketedSeat: {
                    typeOf: sdk_1.chevre.factory.placeType.Seat
                }
            }
        }
        : {
            typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
            reservedTicket: {
                typeOf: 'Ticket'
            }
        };
    const itemOffered = Object.assign({ id: params.itemOffered.id, 
        // イベント検索にて興行名称を参照したいため、name.jaを追加する(2022-09-07~)
        name: { ja: params.itemOffered.name.ja }, serviceOutput }, (typeof ((_a = params.itemOffered.serviceType) === null || _a === void 0 ? void 0 : _a.typeOf) === 'string')
        ? {
            serviceType: {
                codeValue: params.itemOffered.serviceType.codeValue,
                id: params.itemOffered.serviceType.id,
                inCodeSet: params.itemOffered.serviceType.inCodeSet,
                project: params.itemOffered.serviceType.project,
                typeOf: params.itemOffered.serviceType.typeOf
            }
        }
        : undefined);
    const seller = {
        typeOf: params.seller.typeOf,
        id: String(params.seller.id),
        name: params.seller.name
    };
    return Object.assign({ project: { typeOf: sdk_1.chevre.factory.organizationType.Project, id: params.project.id }, typeOf: sdk_1.chevre.factory.offerType.Offer, priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY, availabilityEnds: params.availabilityEnds, availabilityStarts: params.availabilityStarts, eligibleQuantity: {
            typeOf: 'QuantitativeValue',
            unitCode: sdk_1.chevre.factory.unitCode.C62,
            maxValue: Number(params.eligibleQuantity.maxValue),
            value: 1
        }, itemOffered, validFrom: params.validFrom, validThrough: params.validThrough, seller }, (Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined);
}
function findPlacesFromBody(req) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const movieTheaterBranchCode = String(req.body.theater);
        const screeningRoomBranchCode = String(req.body.screen);
        const searchMovieTheatersResult = yield repos.place.searchMovieTheaters({
            limit: 1,
            id: { $eq: movieTheaterBranchCode }
        });
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new Error('施設が見つかりません');
        }
        const searchRoomsResult = yield repos.place.searchScreeningRooms({
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
    });
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createEventFromBody(req) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
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
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
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
        const screeningEventSeries = yield eventService.findById({
            id: req.body.screeningEventId
        });
        const { movieTheater, screeningRoom } = yield findPlacesFromBody(req)({ place: placeService });
        const seller = yield sellerService.findById({ id: req.body.seller });
        // カタログIDから興行選択→興行のカタログ設定を適用(2022-09-01~)
        const searchEventServicesResult = yield productService.search({
            limit: 1,
            typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.EventService },
            productID: { $eq: `${sdk_1.chevre.factory.product.ProductType.EventService}${req.body.eventServiceId}` }
        });
        const eventServiceProduct = searchEventServicesResult.data.shift();
        if (eventServiceProduct === undefined) {
            throw new Error('興行が見つかりません');
        }
        const offerCatalogId = (_b = eventServiceProduct.hasOfferCatalog) === null || _b === void 0 ? void 0 : _b.id;
        if (typeof offerCatalogId !== 'string') {
            throw new Error('興行のカタログ設定が見つかりません');
        }
        const catalog = yield offerCatalogService.findById({ id: offerCatalogId });
        // const catalog = await offerCatalogService.findById({ id: req.body.eventServiceId });
        if (typeof catalog.id !== 'string') {
            throw new Error('Offer Catalog ID undefined');
        }
        let serviceType;
        const serviceTypeCode = (_c = eventServiceProduct.serviceType) === null || _c === void 0 ? void 0 : _c.codeValue;
        // const offerCatagoryServiceTypeCode = catalog.itemOffered.serviceType?.codeValue;
        if (typeof serviceTypeCode === 'string') {
            const searchServiceTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
                codeValue: { $eq: serviceTypeCode }
            });
            serviceType = searchServiceTypesResult.data.shift();
            if (serviceType === undefined) {
                throw new Error('興行区分が見つかりません');
            }
        }
        let offersValidAfterStart;
        if (req.body.endSaleTimeAfterScreening !== undefined && req.body.endSaleTimeAfterScreening !== '') {
            offersValidAfterStart = Number(req.body.endSaleTimeAfterScreening);
        }
        else if (typeof ((_e = (_d = movieTheater.offers) === null || _d === void 0 ? void 0 : _d.availabilityEndsGraceTime) === null || _e === void 0 ? void 0 : _e.value) === 'number') {
            // tslint:disable-next-line:no-magic-numbers
            offersValidAfterStart = Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60);
        }
        else {
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
        let unacceptedPaymentMethod;
        // ムビチケ除外の場合は対応決済方法を追加
        if (req.body.mvtkExcludeFlg === '1' || req.body.mvtkExcludeFlg === screeningEventSeries_1.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET) {
            if (!Array.isArray(unacceptedPaymentMethod)) {
                unacceptedPaymentMethod = [];
            }
            unacceptedPaymentMethod.push(screeningEventSeries_1.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET);
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
            itemOffered: {
                id: String(eventServiceProduct.id),
                name: {
                    ja: (typeof eventServiceProduct.name === 'string')
                        ? eventServiceProduct.name
                        : String((_f = eventServiceProduct.name) === null || _f === void 0 ? void 0 : _f.ja)
                },
                serviceType
            },
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
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
            doorTime: doorTime,
            startDate: startDate,
            endDate: endDate,
            workPerformed: superEvent.workPerformed,
            location: eventLocation,
            superEvent: superEvent,
            name: superEvent.name,
            eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled,
            offers: offers,
            checkInCount: undefined,
            attendeeCount: undefined,
            additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : []
            // hasOfferCatalogを完全廃止(2022-09-09~)
            // ...(USE_EVENT_HAS_OFFER_CATALOG)
            //     ? {
            //         hasOfferCatalog: {
            //             typeOf: 'OfferCatalog',
            //             id: catalog.id,
            //             identifier: catalog.identifier
            //         }
            //     }
            //     : undefined
        };
    });
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
function createMultipleEventFromBody(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
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
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
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
        const screeningEventSeries = yield eventService.findById({
            id: req.body.screeningEventId
        });
        const { screeningRoom } = yield findPlacesFromBody(req)({ place: placeService });
        const seller = yield sellerService.findById({ id: req.body.seller });
        const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
            ? Number(req.body.maximumAttendeeCapacity)
            : undefined;
        validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity);
        const startDate = moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const toDate = moment(`${req.body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const weekDays = req.body.weekDayData;
        const eventServiceIds = req.body.eventServiceIds;
        const mvtkExcludeFlgs = req.body.mvtkExcludeFlgData;
        const timeData = req.body.timeData;
        // カタログIDから興行選択→興行のカタログ設定を適用(2022-09-01~)
        const searchEventServicesResult = yield productService.search({
            limit: 100,
            page: 1,
            typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.EventService },
            productID: {
                $in: eventServiceIds.map((eventServiceId) => {
                    return `${sdk_1.chevre.factory.product.ProductType.EventService}${eventServiceId}`;
                })
            }
        });
        const eventServiceProducts = searchEventServicesResult.data;
        const offerCatalogs = [];
        // UIの制限上、eventServiceIdsは100件未満なので↓で問題なし
        const searchTicketTypeGroupsResult = yield offerCatalogService.search({
            limit: 100,
            page: 1,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: productType_1.ProductType.EventService } },
            id: { $in: eventServiceIds }
        });
        offerCatalogs.push(...searchTicketTypeGroupsResult.data);
        // 興行検索結果に含まれる興行区分のみ検索する(code.$in)
        // const serviceTypeCodeValues: string[] = offerCatalogs.filter((o) => typeof o.itemOffered.serviceType?.codeValue === 'string')
        //     .map((o) => <string>o.itemOffered.serviceType?.codeValue);
        const serviceTypeCodeValues = eventServiceProducts.filter((o) => { var _a; return typeof ((_a = o.serviceType) === null || _a === void 0 ? void 0 : _a.codeValue) === 'string'; })
            .map((o) => { var _a; return (_a = o.serviceType) === null || _a === void 0 ? void 0 : _a.codeValue; });
        const searchServiceTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
            codeValue: { $in: serviceTypeCodeValues }
        });
        const serviceTypes = searchServiceTypesResult.data;
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
                    let salesStartDate;
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
                    let salesEndDate;
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
                    let unacceptedPaymentMethod;
                    // ムビチケ除外の場合は対応決済方法を追加
                    if (mvtkExcludeFlgs[i] === '1' || mvtkExcludeFlgs[i] === screeningEventSeries_1.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET) {
                        if (!Array.isArray(unacceptedPaymentMethod)) {
                            unacceptedPaymentMethod = [];
                        }
                        unacceptedPaymentMethod.push(screeningEventSeries_1.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET);
                    }
                    const eventServiceProduct = eventServiceProducts.find((p) => p.productID === `${sdk_1.chevre.factory.product.ProductType.EventService}${eventServiceIds[i]}`);
                    if (eventServiceProduct === undefined) {
                        throw new Error('興行が見つかりません');
                    }
                    const offerCatalogId = (_a = eventServiceProduct.hasOfferCatalog) === null || _a === void 0 ? void 0 : _a.id;
                    if (typeof offerCatalogId !== 'string') {
                        throw new Error('興行のカタログ設定が見つかりません');
                    }
                    const offerCatalog = offerCatalogs.find((t) => t.id === offerCatalogId);
                    if (offerCatalog === undefined) {
                        throw new Error('カタログが見つかりません');
                    }
                    if (typeof offerCatalog.id !== 'string') {
                        throw new Error('Offer Catalog ID undefined');
                    }
                    let serviceType;
                    const serviceTypeCode = (_b = eventServiceProduct.serviceType) === null || _b === void 0 ? void 0 : _b.codeValue;
                    // const serviceTypeCode = offerCatalog.itemOffered.serviceType?.codeValue;
                    if (typeof serviceTypeCode === 'string') {
                        serviceType = serviceTypes.find((t) => t.codeValue === serviceTypeCode);
                        if (serviceType === undefined) {
                            throw new sdk_1.chevre.factory.errors.NotFound('興行区分');
                        }
                    }
                    const offers = createOffers({
                        project: { id: req.project.id },
                        availabilityEnds: salesEndDate,
                        availabilityStarts: onlineDisplayStartDate,
                        eligibleQuantity: { maxValue: Number(req.body.maxSeatNumber) },
                        itemOffered: {
                            id: String(eventServiceProduct.id),
                            name: {
                                ja: (typeof eventServiceProduct.name === 'string')
                                    ? eventServiceProduct.name
                                    : String((_c = eventServiceProduct.name) === null || _c === void 0 ? void 0 : _c.ja)
                            },
                            serviceType
                        },
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
                        typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
                        doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(),
                        startDate: eventStartDate,
                        endDate: moment(`${formattedEndDate}T${data.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(),
                        workPerformed: superEvent.workPerformed,
                        location: eventLocation,
                        superEvent: superEvent,
                        name: superEvent.name,
                        eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled,
                        offers: offers,
                        checkInCount: undefined,
                        attendeeCount: undefined
                        // hasOfferCatalogを完全廃止(2022-09-09~)
                        // ...(USE_EVENT_HAS_OFFER_CATALOG)
                        //     ? {
                        //         hasOfferCatalog: {
                        //             typeOf: 'OfferCatalog',
                        //             id: offerCatalog.id,
                        //             identifier: offerCatalog.identifier
                        //         }
                        //     }
                        //     : undefined
                    });
                });
            }
        }
        return attributes;
    });
}
function validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity) {
    if ((subscription === null || subscription === void 0 ? void 0 : subscription.settings.allowNoCapacity) !== true) {
        if (typeof maximumAttendeeCapacity !== 'number') {
            throw new Error('キャパシティを入力してください');
        }
    }
    if (typeof maximumAttendeeCapacity === 'number') {
        if (maximumAttendeeCapacity < 0) {
            throw new Error('キャパシティには正の値を入力してください');
        }
        const maximumAttendeeCapacitySetting = subscription === null || subscription === void 0 ? void 0 : subscription.settings.maximumAttendeeCapacity;
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
        (0, express_validator_1.body)('screeningEventId', '施設コンテンツが未選択です')
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
        (0, express_validator_1.body)('seller', '販売者が未選択です')
            .notEmpty()
    ];
}
/**
 * 編集バリデーション
 */
function updateValidation() {
    return [
        (0, express_validator_1.body)('screeningEventId', '施設コンテンツが未選択です')
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
        (0, express_validator_1.body)('seller', '販売者が未選択です')
            .notEmpty()
    ];
}
