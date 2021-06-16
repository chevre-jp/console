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
/**
 * 上映イベント管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const productType_1 = require("../../factory/productType");
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
const screeningEventRouter = express_1.Router();
screeningEventRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        let subscriptionIdentifier = (_a = chevreProject.subscription) === null || _a === void 0 ? void 0 : _a.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
            limit: 1,
            project: { ids: [req.project.id] }
        });
        if (searchMovieTheatersResult.data.length === 0) {
            throw new Error('施設が見つかりません');
        }
        res.render('events/screeningEvent/index', {
            defaultMovieTheater: searchMovieTheatersResult.data[0],
            moment: moment,
            subscription,
            useAdvancedScheduling: subscription === null || subscription === void 0 ? void 0 : subscription.settings.useAdvancedScheduling
        });
    }
    catch (err) {
        next(err);
    }
}));
screeningEventRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
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
    // const offerCatalogService = new chevre.service.OfferCatalog({
    //     endpoint: <string>process.env.API_ENDPOINT,
    //     auth: req.user.authClient
    // });
    try {
        debug('searching...query:', req.query);
        const now = new Date();
        const format = req.query.format;
        const date = req.query.date;
        const days = Number(format);
        const locationId = req.query.theater;
        const screeningRoomBranchCode = req.query.screen;
        const superEventWorkPerformedIdentifierEq = (_c = (_b = req.query.superEvent) === null || _b === void 0 ? void 0 : _b.workPerformed) === null || _c === void 0 ? void 0 : _c.identifier;
        const onlyEventScheduled = req.query.onlyEventScheduled === '1';
        const searchConditions = Object.assign({ sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }, project: { ids: [req.project.id] }, typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent, eventStatuses: (onlyEventScheduled) ? [sdk_1.chevre.factory.eventStatusType.EventScheduled] : undefined, inSessionFrom: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                .toDate(), inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                .add(days, 'day')
                .toDate(), 
            // inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
            //     .add(1, 'day')
            //     .toDate(),
            superEvent: {
                location: { id: { $eq: locationId } },
                workPerformedIdentifiers: (typeof superEventWorkPerformedIdentifierEq === 'string'
                    && superEventWorkPerformedIdentifierEq.length > 0)
                    ? [superEventWorkPerformedIdentifierEq]
                    : undefined
            }, offers: {
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
                                    ? [sdk_1.chevre.factory.placeType.Seat]
                                    : undefined
                            }
                        }
                    }
                }
            } }, {
            location: {
                branchCode: {
                    $eq: (typeof screeningRoomBranchCode === 'string' && screeningRoomBranchCode.length > 0)
                        ? screeningRoomBranchCode
                        : undefined
                }
            }
        });
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
                    id: { $eq: locationId }
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
            // const searchTicketTypeGroupsResult = await offerCatalogService.search({
            //     project: { id: { $eq: req.project.id } },
            //     itemOffered: { typeOf: { $eq: ProductType.EventService } }
            // });
            res.json({
                performances: events,
                screens: searchScreeningRoomsResult.data
                // ticketGroups: searchTicketTypeGroupsResult.data
            });
        }
    }
    catch (err) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
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
            project: { ids: [req.project.id] },
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
screeningEventRouter.post('/regist', ...addValidation(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const validatorResult = express_validator_1.validationResult(req);
        // errors = validatorResult.mapped();
        // const validations = req.validationErrors(true);
        if (!validatorResult.isEmpty()) {
            throw new Error('Invalid');
        }
        debug('saving screening event...', req.body);
        const attributes = yield createMultipleEventFromBody(req, req.user);
        const events = yield eventService.create(attributes);
        debug(events.length, 'events created', events.map((e) => e.id));
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
            res.status(http_status_1.INTERNAL_SERVER_ERROR)
                .json(obj);
        }
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
        const validatorResult = express_validator_1.validationResult(req);
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
            event.eventStatus = sdk_1.chevre.factory.eventStatusType.EventCancelled;
            yield eventService.update({ id: event.id, attributes: event });
            res.json({
                error: undefined
            });
        }
        else {
            res.json({
                error: '開始日時'
            });
        }
    }
    catch (err) {
        debug('delete error', err);
        res.status(http_status_1.NO_CONTENT)
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
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json(err);
    }
}));
screeningEventRouter.get('/:id/hasOfferCatalog', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const eventService = new sdk_1.chevre.service.Event({
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
        if (typeof ((_d = event.hasOfferCatalog) === null || _d === void 0 ? void 0 : _d.id) !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('OfferCatalog');
        }
        const offerCatalog = yield offerCatalogService.findById({ id: event.hasOfferCatalog.id });
        res.json(offerCatalog);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
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
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
screeningEventRouter.get('/:id/availableSeatOffers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g, _h, _j, _k;
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.params.id });
        const { data } = yield eventService.searchSeats(Object.assign({ id: event.id, limit: 100, page: 1 }, {
            branchCode: {
                $regex: (typeof ((_f = (_e = req.query) === null || _e === void 0 ? void 0 : _e.branchCode) === null || _f === void 0 ? void 0 : _f.$eq) === 'string'
                    && ((_h = (_g = req.query) === null || _g === void 0 ? void 0 : _g.branchCode) === null || _h === void 0 ? void 0 : _h.$eq.length) > 0)
                    ? (_k = (_j = req.query) === null || _j === void 0 ? void 0 : _j.branchCode) === null || _k === void 0 ? void 0 : _k.$eq : undefined
            }
        }));
        res.json(data);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
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
        const movieTheater = yield placeService.findMovieTheaterById({ id: req.body.theater });
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
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createEventFromBody(req) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const user = req.user;
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
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
        const movieTheater = yield placeService.findMovieTheaterById({ id: req.body.theater });
        const screeningRoom = movieTheater.containsPlace.find((p) => p.branchCode === req.body.screen);
        if (screeningRoom === undefined) {
            throw new Error('ルームが見つかりません');
        }
        if (screeningRoom.name === undefined) {
            throw new Error('ルーム名称が見つかりません');
        }
        const seller = yield sellerService.findById({ id: req.body.seller });
        const catalog = yield offerCatalogService.findById({ id: req.body.ticketTypeGroup });
        if (typeof catalog.id !== 'string') {
            throw new Error('Offer Catalog ID undefined');
        }
        let serviceType;
        const offerCatagoryServiceTypeCode = (_b = catalog.itemOffered.serviceType) === null || _b === void 0 ? void 0 : _b.codeValue;
        if (typeof offerCatagoryServiceTypeCode === 'string') {
            const searchServiceTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
                codeValue: { $eq: offerCatagoryServiceTypeCode }
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
        else if (movieTheater.offers !== undefined
            && movieTheater.offers.availabilityEndsGraceTime !== undefined
            && movieTheater.offers.availabilityEndsGraceTime.value !== undefined) {
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
        let acceptedPaymentMethod;
        let unacceptedPaymentMethod;
        // ムビチケ除外の場合は対応決済方法を追加
        if (req.body.mvtkExcludeFlg === '1') {
            if (!Array.isArray(unacceptedPaymentMethod)) {
                unacceptedPaymentMethod = [];
            }
            unacceptedPaymentMethod.push(sdk_1.chevre.factory.paymentMethodType.MovieTicket);
            Object.keys(sdk_1.chevre.factory.paymentMethodType)
                .forEach((key) => {
                if (acceptedPaymentMethod === undefined) {
                    acceptedPaymentMethod = [];
                }
                const paymentMethodType = sdk_1.chevre.factory.paymentMethodType[key];
                if (paymentMethodType !== sdk_1.chevre.factory.paymentMethodType.MovieTicket) {
                    acceptedPaymentMethod.push(paymentMethodType);
                }
            });
        }
        const serviceOutput = (req.body.reservedSeatsAvailable === '1')
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
        const offers = Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, 
            // id: catalog.id,
            // name: catalog.name,
            typeOf: sdk_1.chevre.factory.offerType.Offer, priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY, availabilityEnds: salesEndDate, availabilityStarts: onlineDisplayStartDate, eligibleQuantity: {
                typeOf: 'QuantitativeValue',
                unitCode: sdk_1.chevre.factory.unitCode.C62,
                maxValue: Number(req.body.maxSeatNumber),
                value: 1
            }, itemOffered: {
                serviceType: serviceType,
                serviceOutput: serviceOutput
            }, validFrom: salesStartDate, validThrough: salesEndDate }, (Array.isArray(acceptedPaymentMethod)) ? { acceptedPaymentMethod: acceptedPaymentMethod } : undefined), (Array.isArray(unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: unacceptedPaymentMethod } : undefined), {
            seller: {
                typeOf: seller.typeOf,
                id: seller.id,
                name: seller.name
            }
        });
        const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
            ? Number(req.body.maximumAttendeeCapacity)
            : undefined;
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
        return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent, doorTime: doorTime, startDate: startDate, endDate: endDate, workPerformed: screeningEventSeries.workPerformed, location: Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: screeningRoom.typeOf, branchCode: screeningRoom.branchCode, name: screeningRoom.name, alternateName: screeningRoom.alternateName, address: screeningRoom.address }, (typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined), superEvent: screeningEventSeries, name: screeningEventSeries.name, eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled, offers: offers, checkInCount: undefined, attendeeCount: undefined, additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : [] }, {
            hasOfferCatalog: {
                typeOf: 'OfferCatalog',
                id: catalog.id
            }
        });
    });
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:max-func-body-length
function createMultipleEventFromBody(req, user) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
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
        const movieTheater = yield placeService.findMovieTheaterById({ id: req.body.theater });
        const screeningRoom = movieTheater.containsPlace.find((p) => p.branchCode === req.body.screen);
        if (screeningRoom === undefined) {
            throw new Error('ルームが見つかりません');
        }
        if (screeningRoom.name === undefined) {
            throw new Error('ルーム名称が見つかりません');
        }
        const seller = yield sellerService.findById({ id: req.body.seller });
        const maximumAttendeeCapacity = (typeof req.body.maximumAttendeeCapacity === 'string' && req.body.maximumAttendeeCapacity.length > 0)
            ? Number(req.body.maximumAttendeeCapacity)
            : undefined;
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
        const startDate = moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const toDate = moment(`${req.body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const weekDays = req.body.weekDayData;
        const ticketTypeIds = req.body.ticketData;
        const mvtkExcludeFlgs = req.body.mvtkExcludeFlgData;
        const timeData = req.body.timeData;
        const searchTicketTypeGroupsResult = yield offerCatalogService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: productType_1.ProductType.EventService } }
        });
        const ticketTypeGroups = searchTicketTypeGroupsResult.data;
        const searchServiceTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } }
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
                    var _a;
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
                    let acceptedPaymentMethod;
                    let unacceptedPaymentMethod;
                    // ムビチケ除外の場合は対応決済方法を追加
                    if (mvtkExcludeFlgs[i] === '1') {
                        if (!Array.isArray(unacceptedPaymentMethod)) {
                            unacceptedPaymentMethod = [];
                        }
                        unacceptedPaymentMethod.push(sdk_1.chevre.factory.paymentMethodType.MovieTicket);
                        Object.keys(sdk_1.chevre.factory.paymentMethodType)
                            .forEach((key) => {
                            if (acceptedPaymentMethod === undefined) {
                                acceptedPaymentMethod = [];
                            }
                            const paymentMethodType = sdk_1.chevre.factory.paymentMethodType[key];
                            if (paymentMethodType !== sdk_1.chevre.factory.paymentMethodType.MovieTicket) {
                                acceptedPaymentMethod.push(paymentMethodType);
                            }
                        });
                    }
                    const ticketTypeGroup = ticketTypeGroups.find((t) => t.id === ticketTypeIds[i]);
                    if (ticketTypeGroup === undefined) {
                        throw new Error('Ticket Type Group');
                    }
                    if (typeof ticketTypeGroup.id !== 'string') {
                        throw new Error('Offer Catalog ID undefined');
                    }
                    let serviceType;
                    const offerCatagoryServiceTypeCode = (_a = ticketTypeGroup.itemOffered.serviceType) === null || _a === void 0 ? void 0 : _a.codeValue;
                    if (typeof offerCatagoryServiceTypeCode === 'string') {
                        serviceType = serviceTypes.find((t) => t.codeValue === offerCatagoryServiceTypeCode);
                        if (serviceType === undefined) {
                            throw new sdk_1.chevre.factory.errors.NotFound('サービス区分');
                        }
                    }
                    const serviceOutput = (req.body.reservedSeatsAvailable === '1')
                        ? {
                            typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
                            reservedTicket: {
                                typeOf: 'Ticket',
                                ticketedSeat: { typeOf: sdk_1.chevre.factory.placeType.Seat }
                            }
                        } : {
                        typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
                        reservedTicket: {
                            typeOf: 'Ticket'
                        }
                    };
                    const offers = Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, 
                        // id: ticketTypeGroup.id,
                        // name: ticketTypeGroup.name,
                        typeOf: sdk_1.chevre.factory.offerType.Offer, priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY, availabilityEnds: salesEndDate, availabilityStarts: onlineDisplayStartDate, eligibleQuantity: {
                            typeOf: 'QuantitativeValue',
                            unitCode: sdk_1.chevre.factory.unitCode.C62,
                            maxValue: Number(req.body.maxSeatNumber),
                            value: 1
                        }, itemOffered: {
                            serviceType: serviceType,
                            serviceOutput: serviceOutput
                        }, validFrom: salesStartDate, validThrough: salesEndDate, seller: {
                            typeOf: seller.typeOf,
                            id: seller.id,
                            name: seller.name
                        } }, (Array.isArray(acceptedPaymentMethod)) ? { acceptedPaymentMethod: acceptedPaymentMethod } : undefined), (Array.isArray(unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: unacceptedPaymentMethod } : undefined);
                    attributes.push(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent, doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(), startDate: eventStartDate, endDate: moment(`${formattedEndDate}T${data.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(), workPerformed: screeningEventSeries.workPerformed, location: Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: screeningRoom.typeOf, branchCode: screeningRoom.branchCode, name: screeningRoom.name === undefined
                                ? { en: '', ja: '', kr: '' }
                                : screeningRoom.name, alternateName: screeningRoom.alternateName, address: screeningRoom.address }, (typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined), superEvent: screeningEventSeries, name: screeningEventSeries.name, eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled, offers: offers, checkInCount: undefined, attendeeCount: undefined }, {
                        hasOfferCatalog: {
                            typeOf: 'OfferCatalog',
                            id: ticketTypeGroup.id
                        }
                    }));
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
        express_validator_1.body('screeningEventId', '施設コンテンツが未選択です')
            .notEmpty(),
        express_validator_1.body('startDate', '開催日が未選択です')
            .notEmpty(),
        express_validator_1.body('toDate', '開催日が未選択です')
            .notEmpty(),
        express_validator_1.body('weekDayData', '曜日が未選択です')
            .notEmpty(),
        express_validator_1.body('screen', 'ルームが未選択です')
            .notEmpty(),
        express_validator_1.body('theater', '施設が未選択です')
            .notEmpty(),
        express_validator_1.body('timeData', '時間情報が未選択です')
            .notEmpty(),
        express_validator_1.body('ticketData', 'カタログが未選択です')
            .notEmpty(),
        express_validator_1.body('seller', '販売者が未選択です')
            .notEmpty()
    ];
}
/**
 * 編集バリデーション
 */
function updateValidation() {
    return [
        express_validator_1.body('screeningEventId', '上映イベントシリーズが未選択です')
            .notEmpty(),
        express_validator_1.body('day', '開催日が未選択です')
            .notEmpty(),
        express_validator_1.body('doorTime', '開場時刻が未選択です')
            .notEmpty(),
        express_validator_1.body('startTime', '開始時刻が未選択です')
            .notEmpty(),
        express_validator_1.body('endTime', '終了時刻が未選択です')
            .notEmpty(),
        express_validator_1.body('screen', 'ルームが未選択です')
            .notEmpty(),
        express_validator_1.body('ticketTypeGroup', 'カタログが未選択です')
            .notEmpty(),
        express_validator_1.body('seller', '販売者が未選択です')
            .notEmpty()
    ];
}
exports.default = screeningEventRouter;
