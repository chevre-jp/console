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
 * イベントルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const pug = require("pug");
const offers_1 = require("../offers");
const movieTheater_1 = require("../places/movieTheater");
const screeningEventSeries_1 = require("./screeningEventSeries");
const TimelineFactory = require("../../factory/timeline");
const validateCsrfToken_1 = require("../../middlewares/validateCsrfToken");
// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions = require('../../../subscriptions.json');
const DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;
const POS_CLIENT_ID = process.env.POS_CLIENT_ID;
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
        const applications = yield (0, offers_1.searchApplications)(req);
        res.render('events/screeningEvent/index', {
            defaultMovieTheater: searchMovieTheatersResult.data[0],
            moment: moment,
            subscription,
            useAdvancedScheduling: subscription === null || subscription === void 0 ? void 0 : subscription.settings.useAdvancedScheduling,
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
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const now = new Date();
    const format = req.query.format;
    const date = req.query.date;
    const days = Number(format);
    const locationId = req.query.theater;
    const screeningRoomBranchCode = req.query.screen;
    const superEventWorkPerformedIdentifierEq = (_b = (_a = req.query.superEvent) === null || _a === void 0 ? void 0 : _a.workPerformed) === null || _b === void 0 ? void 0 : _b.identifier;
    const onlyEventScheduled = req.query.onlyEventScheduled === '1';
    const idEq = (_c = req.query.id) === null || _c === void 0 ? void 0 : _c.$eq;
    const offersAvailable = req.query.offersAvailable === '1';
    const offersValid = req.query.offersValid === '1';
    const availableAtOrFromId = req.query.availableAtOrFromId;
    const additionalPropertyElemMatchNameEq = (_f = (_e = (_d = req.query.additionalProperty) === null || _d === void 0 ? void 0 : _d.$elemMatch) === null || _e === void 0 ? void 0 : _e.name) === null || _f === void 0 ? void 0 : _f.$eq;
    return {
        sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
        project: { id: { $eq: req.project.id } },
        typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
        eventStatuses: (onlyEventScheduled) ? [sdk_1.chevre.factory.eventStatusType.EventScheduled] : undefined,
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
                    $in: (typeof ((_g = req.query.itemOffered) === null || _g === void 0 ? void 0 : _g.id) === 'string' && req.query.itemOffered.id.length > 0)
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
                $eq: (typeof ((_h = req.query.hasOfferCatalog) === null || _h === void 0 ? void 0 : _h.id) === 'string' && req.query.hasOfferCatalog.id.length > 0)
                    ? req.query.hasOfferCatalog.id
                    : undefined
            }
        },
        additionalProperty: Object.assign({}, (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
            ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
            : undefined)
    };
}
screeningEventRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e;
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
        const additionalPropertyElemMatchNameEq = (_e = (_d = (_c = req.query.additionalProperty) === null || _c === void 0 ? void 0 : _c.$elemMatch) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.$eq;
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
                    return Object.assign(Object.assign(Object.assign({}, event), { makesOfferCount: (Array.isArray((_c = (_b = event.offers) === null || _b === void 0 ? void 0 : _b.seller) === null || _c === void 0 ? void 0 : _c.makesOffer))
                            ? event.offers.seller.makesOffer.length
                            : 0 }), (additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined);
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
            typeOf: order.typeOf,
            seller: order.seller,
            customer: order.customer,
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
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
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
    var _f, _g, _h;
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
        const eventServiceId = (_g = (_f = event.offers) === null || _f === void 0 ? void 0 : _f.itemOffered) === null || _g === void 0 ? void 0 : _g.id;
        if (typeof eventServiceId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const eventServiceProduct = yield productService.findById({ id: eventServiceId });
        const offerCatalogId = (_h = eventServiceProduct.hasOfferCatalog) === null || _h === void 0 ? void 0 : _h.id;
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
screeningEventRouter.get('/:id/itemOffered', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k;
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
        const eventServiceId = (_k = (_j = event.offers) === null || _j === void 0 ? void 0 : _j.itemOffered) === null || _k === void 0 ? void 0 : _k.id;
        if (typeof eventServiceId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const eventServiceProduct = yield productService.findById({ id: eventServiceId });
        res.json(eventServiceProduct);
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
screeningEventRouter.get('/:id/showCatalog', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _l, _m, _o;
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
        const eventServiceId = (_m = (_l = event.offers) === null || _l === void 0 ? void 0 : _l.itemOffered) === null || _m === void 0 ? void 0 : _m.id;
        if (typeof eventServiceId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('event.offers.itemOffered.id');
        }
        const eventServiceProduct = yield productService.findById({ id: eventServiceId });
        const offerCatalogId = (_o = eventServiceProduct.hasOfferCatalog) === null || _o === void 0 ? void 0 : _o.id;
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
    var _p;
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        const event = yield eventService.findById({ id: req.params.id });
        let offers = [];
        const offerWithAggregateReservationByEvent = (_p = event.aggregateOffer) === null || _p === void 0 ? void 0 : _p.offers;
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
    var _q, _r, _s, _t, _u, _v;
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
                $regex: (typeof ((_r = (_q = req.query) === null || _q === void 0 ? void 0 : _q.branchCode) === null || _r === void 0 ? void 0 : _r.$eq) === 'string'
                    && ((_t = (_s = req.query) === null || _s === void 0 ? void 0 : _s.branchCode) === null || _t === void 0 ? void 0 : _t.$eq.length) > 0)
                    ? (_v = (_u = req.query) === null || _u === void 0 ? void 0 : _u.branchCode) === null || _v === void 0 ? void 0 : _v.$eq
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
                    importThrough: importThrough,
                    saveMovieTheater: false,
                    saveScreeningEventSeries: false
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
// tslint:disable-next-line:max-func-body-length
function createOffers(params) {
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
    // makesOfferを自動設定(2022-11-19~)
    let makesOffer;
    if (params.isNew) {
        // 新規作成時は、自動的に全販売アプリケーションを設定
        makesOffer = params.customerMembers.map((member) => {
            // POS_CLIENT_IDのみデフォルト設定を調整
            if (typeof POS_CLIENT_ID === 'string' && POS_CLIENT_ID === member.member.id) {
                if (!(params.availabilityEndsOnPOS instanceof Date)
                    || !(params.availabilityStartsOnPOS instanceof Date)
                    || !(params.validFromOnPOS instanceof Date)
                    || !(params.validThroughOnPOS instanceof Date)) {
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
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEndsOnPOS,
                    availabilityStarts: params.availabilityStartsOnPOS,
                    validFrom: params.validFromOnPOS,
                    validThrough: params.validThroughOnPOS // 1 month later from startDate
                };
            }
            else {
                // POS_CLIENT_ID以外は共通設定
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEnds,
                    availabilityStarts: params.availabilityStarts,
                    validFrom: params.validFrom,
                    validThrough: params.validThrough
                };
            }
        });
    }
    else {
        makesOffer = [];
        params.makesOffers4update.forEach((makesOffer4update) => {
            var _a;
            const applicationId = String((_a = makesOffer4update.availableAtOrFrom) === null || _a === void 0 ? void 0 : _a.id);
            // アプリケーションメンバーの存在検証(バックエンドで検証しているため不要か)
            // const applicationExists = params.customerMembers.some((customerMember) => customerMember.member.id === applicationId);
            // if (!applicationExists) {
            //     throw new Error(`アプリケーション: ${applicationId} が見つかりません`);
            // }
            // アプリケーションの重複を排除
            const alreadyExistsInMakesOffer = makesOffer.some((offer) => {
                var _a;
                return Array.isArray(offer.availableAtOrFrom) && ((_a = offer.availableAtOrFrom[0]) === null || _a === void 0 ? void 0 : _a.id) === applicationId;
            });
            if (!alreadyExistsInMakesOffer) {
                const validFromMoment = moment(`${makesOffer4update.validFromDate}T${makesOffer4update.validFromTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const validThroughMoment = moment(`${makesOffer4update.validThroughDate}T${makesOffer4update.validThroughTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const availabilityStartsMoment = moment(`${makesOffer4update.availabilityStartsDate}T${makesOffer4update.availabilityStartsTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                if (!validFromMoment.isValid() || !validThroughMoment.isValid() || !availabilityStartsMoment.isValid()) {
                    throw new Error('販売アプリ設定の日時を正しく入力してください');
                }
                makesOffer.push({
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: applicationId }],
                    availabilityEnds: validThroughMoment.toDate(),
                    availabilityStarts: availabilityStartsMoment.toDate(),
                    validFrom: validFromMoment.toDate(),
                    validThrough: validThroughMoment.toDate()
                });
            }
        });
    }
    const seller = { id: params.seller.id, makesOffer };
    const makesOfferValidFromMin = moment(params.startDate)
        .add(-movieTheater_1.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
    const makesOfferValidFromMax = moment(params.startDate)
        .add(movieTheater_1.ONE_MONTH_IN_DAYS, 'days');
    const makesOfferOnTransactionApp = makesOffer.find((offer) => {
        return Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom[0].id === offers_1.SMART_THEATER_CLIENT_NEW;
    });
    const availabilityEnds = (!params.isNew)
        ? (
        // 編集の場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
        (makesOfferOnTransactionApp !== undefined)
            ? makesOfferOnTransactionApp.availabilityEnds
            // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前まで)
            : makesOfferValidFromMin.toDate())
        : params.availabilityEnds;
    const availabilityStarts = (!params.isNew)
        ? (
        // 編集の場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
        (makesOfferOnTransactionApp !== undefined)
            ? makesOfferOnTransactionApp.availabilityStarts
            // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前から)
            : makesOfferValidFromMin.toDate())
        : params.availabilityStarts;
    const validFrom = (!params.isNew)
        ? (
        // 編集の場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
        (makesOfferOnTransactionApp !== undefined)
            ? makesOfferOnTransactionApp.validFrom
            // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前から)
            : makesOfferValidFromMin.toDate())
        : params.validFrom;
    const validThrough = (!params.isNew)
        ? (
        // 編集の場合、SMART_THEATER_CLIENT_NEWの設定を強制適用
        (makesOfferOnTransactionApp !== undefined)
            ? makesOfferOnTransactionApp.validThrough
            // 十分に利用不可能な日時に(MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前まで)
            : makesOfferValidFromMin.toDate())
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
        throw new Error(`販売期間と表示期間は${movieTheater_1.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS}日前~${movieTheater_1.ONE_MONTH_IN_DAYS}日後の間で入力してください`);
    }
    return Object.assign({ availabilityEnds,
        availabilityStarts, eligibleQuantity: { maxValue: Number(params.eligibleQuantity.maxValue) }, itemOffered: {
            id: params.itemOffered.id,
            serviceOutput
        }, validFrom,
        validThrough,
        seller }, (Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined);
}
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
        const screeningEventSeriesId = req.body.screeningEventId;
        const screeningRoomBranchCode = req.body.screen;
        const { movieTheater } = yield findPlacesFromBody(req)({ place: placeService });
        const sellerId = req.body.seller;
        // プロダクト検索に変更(2022-11-05)
        const searchEventServicesResult = yield productService.search({
            limit: 1,
            typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.EventService },
            id: { $eq: `${req.body.eventServiceId}` }
        });
        const eventServiceProduct = searchEventServicesResult.data.shift();
        if (eventServiceProduct === undefined) {
            throw new Error('興行が見つかりません');
        }
        if (typeof ((_b = eventServiceProduct.hasOfferCatalog) === null || _b === void 0 ? void 0 : _b.id) !== 'string') {
            throw new Error('興行のカタログ設定が見つかりません');
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
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
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
            superEvent: { id: screeningEventSeriesId },
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
        const screeningEventSeriesId = req.body.screeningEventId;
        const screeningRoomBranchCode = req.body.screen;
        const sellerId = req.body.seller;
        const { movieTheater } = yield findPlacesFromBody(req)({ place: placeService });
        const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
            ? Number(req.body.maximumAttendeeCapacity)
            : undefined;
        validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity);
        const startDate = moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const toDate = moment(`${req.body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const weekDays = req.body.weekDayData;
        // 現時点でカタログIDとして受け取っている
        const eventServiceIds = req.body.eventServiceIds;
        const mvtkExcludeFlgs = req.body.mvtkExcludeFlgData;
        const timeData = req.body.timeData;
        // 興行IDとして受け取る(2022-11-05~)
        const searchEventServicesResult = yield productService.search({
            limit: 100,
            page: 1,
            typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.EventService },
            id: { $in: eventServiceIds }
        });
        const eventServiceProducts = searchEventServicesResult.data;
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
                    const eventServiceProduct = eventServiceProducts.find((p) => p.id === `${eventServiceIds[i]}`);
                    if (eventServiceProduct === undefined) {
                        throw new Error('興行が見つかりません');
                    }
                    if (typeof ((_a = eventServiceProduct.hasOfferCatalog) === null || _a === void 0 ? void 0 : _a.id) !== 'string') {
                        throw new Error('興行のカタログ設定が見つかりません');
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
                        typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
                        doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(),
                        startDate: eventStartDate,
                        endDate,
                        // workPerformed: superEvent.workPerformed,
                        // 最適化(2022-10-01~)
                        location: Object.assign({ branchCode: screeningRoomBranchCode }, (typeof maximumAttendeeCapacity === 'number')
                            ? { maximumAttendeeCapacity }
                            : undefined),
                        // 最適化(2022-10-01~)
                        superEvent: { id: screeningEventSeriesId },
                        // 最適化(2022-10-01~)
                        // name: superEvent.name,
                        eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled,
                        offers: offers
                        // checkInCount: undefined,
                        // attendeeCount: undefined
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
        (0, express_validator_1.body)('seller')
            .notEmpty()
            .withMessage('販売者が未選択です')
            .isString(),
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
        (0, express_validator_1.body)('seller')
            .notEmpty()
            .withMessage('販売者が未選択です')
            .isString(),
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
