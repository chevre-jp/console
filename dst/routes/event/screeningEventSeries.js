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
exports.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET = void 0;
/**
 * 施設コンテンツ管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const translationType_1 = require("../../factory/translationType");
const Message = require("../../message");
const debug = createDebug('chevre-backend:routes');
exports.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET = 'MovieTicket';
const NUM_ADDITIONAL_PROPERTY = 10;
// コード 半角64
const NAME_MAX_LENGTH_CODE = 64;
// 名称・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
const screeningEventSeriesRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all('/add', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
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
    let message = '';
    let errors = {};
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                const searchMovieResult = yield creativeWorkService.searchMovies({
                    project: { id: { $eq: req.project.id } },
                    identifier: { $eq: (_a = req.body.workPerformed) === null || _a === void 0 ? void 0 : _a.identifier }
                });
                const movie = searchMovieResult.data.shift();
                if (movie === undefined) {
                    throw new Error(`Movie ${(_b = req.body.workPerformed) === null || _b === void 0 ? void 0 : _b.identifier} Not Found`);
                }
                const selectedLocation = JSON.parse(req.body.location);
                const movieTheater = yield placeService.findMovieTheaterById({ id: selectedLocation.id });
                const attributes = createEventFromBody(req, movie, movieTheater, true);
                debug('saving an event...', attributes);
                const events = yield eventService.create(attributes);
                debug('event created', events[0]);
                req.flash('message', '登録しました');
                const redirect = `/projects/${req.project.id}/events/screeningEventSeries/${events[0].id}/update`;
                debug('redirecting...', redirect);
                res.redirect(redirect);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        else {
            message = '入力に誤りがあります';
        }
    }
    const forms = Object.assign({ additionalProperty: [], headline: {}, workPerformed: {}, videoFormatType: [] }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 施設を補完
        if (typeof req.body.location === 'string' && req.body.location.length > 0) {
            forms.location = JSON.parse(req.body.location);
        }
        else {
            forms.location = undefined;
        }
        // 上映方式を補完
        if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
            forms.videoFormat = req.body.videoFormat.map((v) => JSON.parse(v));
        }
        else {
            forms.videoFormat = [];
        }
    }
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchProductsResult = yield productService.search({
        project: { id: { $eq: req.project.id } },
        typeOf: {
            $in: [
                sdk_1.chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
            ]
        }
    });
    debug('errors:', errors);
    res.render('events/screeningEventSeries/add', {
        message: message,
        errors: errors,
        forms: forms,
        movie: undefined,
        translationTypes: translationType_1.translationTypes,
        paymentServices: searchProductsResult.data
    });
}));
screeningEventSeriesRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('events/screeningEventSeries/index', {});
}));
screeningEventSeriesRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g, _h, _j;
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchVideoFormatTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType } }
        });
        const videoFormatTypes = searchVideoFormatTypesResult.data;
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield eventService.search({
            limit: limit,
            page: page,
            sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            name: req.query.name,
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
            endFrom: (req.query.containsEnded === '1') ? undefined : new Date(),
            location: {
                branchCode: {
                    $eq: (typeof req.query.locationBranchCode === 'string' && req.query.locationBranchCode.length > 0)
                        ? req.query.locationBranchCode
                        : undefined
                }
            },
            soundFormat: {
                typeOf: {
                    $eq: (typeof ((_d = (_c = req.query.soundFormat) === null || _c === void 0 ? void 0 : _c.typeOf) === null || _d === void 0 ? void 0 : _d.$eq) === 'string'
                        && req.query.soundFormat.typeOf.$eq.length > 0)
                        ? req.query.soundFormat.typeOf.$eq
                        : undefined
                }
            },
            videoFormat: {
                typeOf: {
                    $eq: (typeof ((_f = (_e = req.query.videoFormat) === null || _e === void 0 ? void 0 : _e.typeOf) === null || _f === void 0 ? void 0 : _f.$eq) === 'string'
                        && req.query.videoFormat.typeOf.$eq.length > 0)
                        ? req.query.videoFormat.typeOf.$eq
                        : undefined
                }
            },
            workPerformed: {
                identifiers: (typeof ((_g = req.query.workPerformed) === null || _g === void 0 ? void 0 : _g.identifier) === 'string' && ((_h = req.query.workPerformed) === null || _h === void 0 ? void 0 : _h.identifier.length) > 0)
                    ? [(_j = req.query.workPerformed) === null || _j === void 0 ? void 0 : _j.identifier]
                    : undefined
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((event) => {
                const eventVideoFormatTypes = (Array.isArray(event.videoFormat))
                    ? event.videoFormat.map((v) => v.typeOf)
                    : [];
                let videoFormatName = '';
                if (Array.isArray(eventVideoFormatTypes)) {
                    videoFormatName = videoFormatTypes
                        .filter((category) => eventVideoFormatTypes.includes(category.codeValue))
                        .map((category) => { var _a; return (typeof category.name === 'string') ? category.name : (_a = category.name) === null || _a === void 0 ? void 0 : _a.ja; })
                        .join(' ');
                }
                return Object.assign(Object.assign({}, event), { videoFormatName });
            })
        });
    }
    catch (error) {
        res.json({
            success: false,
            count: 0,
            results: error
        });
    }
}));
/**
 * 名前からコンテンツ候補を検索する
 */
screeningEventSeriesRouter.get('/searchMovies', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchMovieResult = yield creativeWorkService.searchMovies({
            limit: 100,
            sort: { identifier: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            offers: {
                availableFrom: new Date()
            },
            name: req.query.q
        });
        res.json(searchMovieResult);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
screeningEventSeriesRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
        const locationId = req.query.locationId;
        const movieTheater = yield placeService.findMovieTheaterById({ id: locationId });
        const branchCode = movieTheater.branchCode;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        if (branchCode === undefined) {
            throw new Error();
        }
        // 上映終了して「いない」施設コンテンツを検索
        const limit = 100;
        const page = 1;
        const { data } = yield eventService.search({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
            inSessionFrom: (fromDate !== undefined)
                ? moment(`${fromDate}T23:59:59+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate()
                : new Date(),
            inSessionThrough: (toDate !== undefined)
                ? moment(`${toDate}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            location: {
                branchCodes: [branchCode]
            },
            name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
        });
        const results = data.map((event) => {
            var _a;
            let mvtkFlg = 1;
            const unacceptedPaymentMethod = (_a = event.offers) === null || _a === void 0 ? void 0 : _a.unacceptedPaymentMethod;
            if (Array.isArray(unacceptedPaymentMethod)
                && unacceptedPaymentMethod.includes(exports.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET)) {
                mvtkFlg = 0;
            }
            let translationType = '';
            if (event.subtitleLanguage !== undefined && event.subtitleLanguage !== null) {
                translationType = '字幕';
            }
            if (event.dubLanguage !== undefined && event.dubLanguage !== null) {
                translationType = '吹替';
            }
            return Object.assign(Object.assign({}, event), { id: event.id, filmNameJa: event.name.ja, filmNameEn: event.name.en, kanaName: event.kanaName, duration: moment.duration(event.duration)
                    .humanize(), translationType: translationType, videoFormat: event.videoFormat, mvtkFlg: mvtkFlg });
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: results
        });
    }
    catch (_) {
        res.json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all('/:eventId/update', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _k;
    try {
        const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
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
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let message = '';
        let errors = {};
        const eventId = req.params.eventId;
        const event = yield eventService.findById({
            id: eventId
        });
        let searchMovieResult = yield creativeWorkService.searchMovies({
            project: { id: { $eq: req.project.id } },
            identifier: { $eq: event.workPerformed.identifier }
        });
        let movie = searchMovieResult.data.shift();
        if (movie === undefined) {
            throw new Error(`Movie ${event.workPerformed.identifier} Not Found`);
        }
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    searchMovieResult = yield creativeWorkService.searchMovies({
                        project: { id: { $eq: req.project.id } },
                        identifier: { $eq: req.body.workPerformed.identifier }
                    });
                    movie = searchMovieResult.data.shift();
                    if (movie === undefined) {
                        throw new Error(`Movie ${req.body.workPerformed.identifier} Not Found`);
                    }
                    const selectedLocation = JSON.parse(req.body.location);
                    const movieTheater = yield placeService.findMovieTheaterById({ id: selectedLocation.id });
                    const attributes = createEventFromBody(req, movie, movieTheater, false);
                    debug('saving an event...', attributes);
                    yield eventService.update({
                        id: eventId,
                        attributes: attributes
                    });
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
            else {
                message = '入力に誤りがあります';
            }
        }
        let mvtkFlg = 1;
        const unacceptedPaymentMethod = (_k = event.offers) === null || _k === void 0 ? void 0 : _k.unacceptedPaymentMethod;
        if (Array.isArray(unacceptedPaymentMethod)
            && unacceptedPaymentMethod.includes(exports.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET)) {
            mvtkFlg = 0;
        }
        let translationType = '';
        if (event.subtitleLanguage !== undefined && event.subtitleLanguage !== null) {
            translationType = translationType_1.TranslationTypeCode.Subtitle;
        }
        if (event.dubLanguage !== undefined && event.dubLanguage !== null) {
            translationType = translationType_1.TranslationTypeCode.Dubbing;
        }
        const forms = Object.assign(Object.assign(Object.assign({ additionalProperty: [], headline: {} }, event), req.body), { nameJa: (typeof req.body.nameJa !== 'string' || req.body.nameJa.length === 0) ? event.name.ja : req.body.nameJa, nameEn: (typeof req.body.nameEn !== 'string' || req.body.nameEn.length === 0) ? event.name.en : req.body.nameEn, duration: (typeof req.body.duration !== 'string' || req.body.duration.length === 0)
                ? moment.duration(event.duration)
                    .asMinutes()
                : req.body.duration, translationType: translationType, videoFormatType: (Array.isArray(event.videoFormat)) ? event.videoFormat.map((f) => f.typeOf) : [], startDate: (typeof req.body.startDate !== 'string' || req.body.startDate.length === 0)
                ? (event.startDate !== null)
                    ? moment(event.startDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : ''
                : req.body.startDate, endDate: (typeof req.body.endDate !== 'string' || req.body.endDate.length === 0)
                ? (event.endDate !== null) ? moment(event.endDate)
                    .tz('Asia/Tokyo')
                    .add(-1, 'day')
                    .format('YYYY/MM/DD')
                    : ''
                : req.body.endDate, mvtkFlg: (typeof req.body.mvtkFlg !== 'string' || req.body.mvtkFlg.length === 0) ? mvtkFlg : req.body.mvtkFlg });
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // 施設を補完
            if (typeof req.body.location === 'string' && req.body.location.length > 0) {
                forms.location = JSON.parse(req.body.location);
            }
            else {
                forms.location = undefined;
            }
            // 上映方式を補完
            if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
                forms.videoFormat = req.body.videoFormat.map((v) => JSON.parse(v));
            }
            else {
                forms.videoFormat = [];
            }
        }
        else {
            if (typeof event.location.id === 'string') {
                const movieTheater = yield placeService.findMovieTheaterById({
                    id: event.location.id
                });
                forms.location = movieTheater;
            }
            else {
                forms.location = undefined;
            }
            if (Array.isArray(event.videoFormat) && event.videoFormat.length > 0) {
                const searchVideoFormatsResult = yield categoryCodeService.search({
                    limit: 100,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType } },
                    codeValue: { $in: event.videoFormat.map((v) => v.typeOf) }
                });
                forms.videoFormat = searchVideoFormatsResult.data;
            }
            else {
                forms.videoFormat = [];
            }
        }
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchProductsResult = yield productService.search({
            project: { id: { $eq: req.project.id } },
            typeOf: {
                $in: [
                    sdk_1.chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                    sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                ]
            }
        });
        res.render('events/screeningEventSeries/edit', {
            message: message,
            errors: errors,
            forms: forms,
            movie: movie,
            translationTypes: translationType_1.translationTypes,
            paymentServices: searchProductsResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
screeningEventSeriesRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // validation
        const event = yield eventService.findById({ id: req.params.id });
        yield preDelete(req, event);
        yield eventService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, eventSeries) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchEventsResult = yield eventService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
            superEvent: { ids: [eventSeries.id] }
        });
        if (searchEventsResult.data.length > 0) {
            throw new Error('関連するスケジュールが存在します');
        }
    });
}
screeningEventSeriesRouter.get('/:eventId/screeningEvents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchScreeningEventsResult = yield eventService.search(Object.assign(Object.assign({}, req.query), { typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent, superEvent: { ids: [req.params.eventId] } }));
        res.json({
            data: searchScreeningEventsResult.data,
            // 使用する側ではスケジュールが存在するかどうかが知れれば十分
            totalCount: searchScreeningEventsResult.data.length
        });
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({ error: { message: error.message } });
    }
}));
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createEventFromBody(req, movie, movieTheater, isNew) {
    var _a, _b, _c;
    let videoFormat = [];
    if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
        const selectedVideoFormats = req.body.videoFormat.map((v) => JSON.parse(v));
        videoFormat = selectedVideoFormats.map((v) => {
            return { typeOf: v.codeValue, name: v.codeValue };
        });
    }
    // videoFormat = (Array.isArray(req.body.videoFormatType)) ? req.body.videoFormatType.map((f: string) => {
    //     return { typeOf: f, name: f };
    // }) : [];
    const soundFormat = (Array.isArray(req.body.soundFormatType)) ? req.body.soundFormatType.map((f) => {
        return { typeOf: f, name: f };
    }) : [];
    let unacceptedPaymentMethod = req.body.unacceptedPaymentMethod;
    if (typeof unacceptedPaymentMethod === 'string') {
        unacceptedPaymentMethod = [unacceptedPaymentMethod];
    }
    const offers = Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.offerType.Offer, priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY }, (Array.isArray(unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: unacceptedPaymentMethod } : undefined);
    let subtitleLanguage;
    if (req.body.translationType === translationType_1.TranslationTypeCode.Subtitle) {
        subtitleLanguage = { typeOf: 'Language', name: 'Japanese' };
    }
    let dubLanguage;
    if (req.body.translationType === translationType_1.TranslationTypeCode.Dubbing) {
        dubLanguage = { typeOf: 'Language', name: 'Japanese' };
    }
    if (typeof movie.duration !== 'string') {
        throw new Error('コンテンツの上映時間が未登録です');
    }
    let description;
    if (typeof req.body.description === 'string' && req.body.description.length > 0) {
        description = { ja: req.body.description };
    }
    let headline;
    if (typeof ((_a = req.body.headline) === null || _a === void 0 ? void 0 : _a.ja) === 'string' && ((_b = req.body.headline) === null || _b === void 0 ? void 0 : _b.ja.length) > 0) {
        headline = { ja: (_c = req.body.headline) === null || _c === void 0 ? void 0 : _c.ja };
    }
    const workPerformed = Object.assign({ project: movie.project, typeOf: movie.typeOf, id: movie.id, identifier: movie.identifier, name: movie.name }, (typeof movie.duration === 'string') ? { duration: movie.duration } : undefined);
    const duration = (typeof movie.duration === 'string') ? movie.duration : undefined;
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries, name: Object.assign({ ja: req.body.nameJa }, (typeof req.body.nameEn === 'string' && req.body.nameEn.length > 0) ? { en: req.body.nameEn } : undefined), kanaName: req.body.kanaName, location: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            id: movieTheater.id,
            typeOf: movieTheater.typeOf,
            branchCode: movieTheater.branchCode,
            name: movieTheater.name,
            kanaName: movieTheater.kanaName
        }, 
        // organizer: {
        //     typeOf: OrganizationType.MovieTheater,
        //     identifier: params.movieTheater.identifier,
        //     name: params.movieTheater.name
        // },
        videoFormat: videoFormat, soundFormat: soundFormat, workPerformed: workPerformed, startDate: (typeof req.body.startDate === 'string' && req.body.startDate.length > 0)
            ? moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate()
            : undefined, endDate: (typeof req.body.endDate === 'string' && req.body.endDate.length > 0)
            ? moment(`${req.body.endDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .add(1, 'day')
                .toDate()
            : undefined, eventStatus: sdk_1.chevre.factory.eventStatusType.EventScheduled, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined, offers: offers }, (typeof duration === 'string') ? { duration } : undefined), (subtitleLanguage !== undefined) ? { subtitleLanguage } : undefined), (dubLanguage !== undefined) ? { dubLanguage } : undefined), (headline !== undefined) ? { headline } : undefined), (description !== undefined) ? { description } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof duration !== 'string') ? { duration: 1 } : undefined), (subtitleLanguage === undefined) ? { subtitleLanguage: 1 } : undefined), (dubLanguage === undefined) ? { dubLanguage: 1 } : undefined), (headline === undefined) ? { headline: 1 } : undefined), (description === undefined) ? { description: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('location')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        express_validator_1.body('workPerformed.identifier', Message.Common.required.replace('$fieldName$', 'コード'))
            .notEmpty(),
        express_validator_1.body('workPerformed.identifier', Message.Common.getMaxLength('コード', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_CODE }),
        express_validator_1.body('nameJa', Message.Common.required.replace('$fieldName$', '名称'))
            .notEmpty(),
        express_validator_1.body('nameJa', Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        express_validator_1.body('kanaName', Message.Common.getMaxLength('名称カナ', NAME_MAX_LENGTH_NAME_JA))
            .optional()
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        // body('startDate')
        //     .isDate()
        //     .withMessage('日付を入力してください'),
        // body('endDate')
        //     .isDate()
        //     .withMessage('日付を入力してください'),
        express_validator_1.body('headline.ja', Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
        // body('videoFormatType', Message.Common.required.replace('$fieldName$', '上映方式'))
        //     .notEmpty()
    ];
}
exports.default = screeningEventSeriesRouter;
