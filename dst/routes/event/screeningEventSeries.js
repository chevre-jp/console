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
exports.screeningEventSeriesRouter = exports.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET = void 0;
/**
 * 施設コンテンツルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const translationType_1 = require("../../factory/translationType");
const Message = require("../../message");
const validateCsrfToken_1 = require("../../middlewares/validateCsrfToken");
exports.DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET = 'MovieTicket';
const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_NAME = 64;
const NAME_MAX_LENGTH_DESCRIPTION = 64;
const screeningEventSeriesRouter = (0, express_1.Router)();
exports.screeningEventSeriesRouter = screeningEventSeriesRouter;
// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all('/add', validateCsrfToken_1.validateCsrfToken, ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const eventService = new sdk_1.chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    let message = '';
    let errors = {};
    let csrfToken;
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                let placeIds;
                if (Array.isArray(req.body.location)) {
                    const selectedLocations = req.body.location.map((location) => {
                        return JSON.parse(String(location));
                    });
                    placeIds = selectedLocations.map((selectedLocation) => String(selectedLocation.id));
                }
                else {
                    const selectedLocation = JSON.parse(req.body.location);
                    placeIds = [selectedLocation.id];
                }
                if (placeIds.length > 0) {
                    let attributesList = [];
                    attributesList = placeIds.map((placeId) => {
                        return createEventFromBody(req, { id: placeId }, true);
                    });
                    const events = yield eventService.create(attributesList);
                    // tslint:disable-next-line:no-dynamic-delete
                    delete req.session.csrfSecret;
                    req.flash('message', `${events.length}つの施設コンテンツを登録しました`);
                    const redirect = `/projects/${req.project.id}/events/screeningEventSeries/${events[0].id}/update`;
                    res.redirect(redirect);
                    return;
                }
                else {
                    throw new Error('施設を選択してください');
                }
            }
            catch (error) {
                message = error.message;
            }
        }
        else {
            message = '入力に誤りがあります';
        }
    }
    else {
        const tokens = new Tokens();
        const csrfSecret = yield tokens.secret();
        csrfToken = tokens.create(csrfSecret);
        req.session.csrfSecret = {
            value: csrfSecret,
            createDate: new Date()
        };
    }
    const forms = Object.assign(Object.assign({ additionalProperty: [], description: {}, headline: {}, workPerformed: {}, videoFormatType: [] }, (typeof csrfToken === 'string') ? { csrfToken } : undefined), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 施設を補完
        if (typeof req.body.location === 'string' && req.body.location.length > 0) {
            forms.location = [JSON.parse(req.body.location)];
        }
        else if (Array.isArray(req.body.location)) {
            forms.location = req.body.location.map((location) => {
                return JSON.parse(String(location));
            });
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
screeningEventSeriesRouter.get('/getlist', 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const additionalPropertyElemMatchNameEq = (_c = (_b = (_a = req.query.additionalProperty) === null || _a === void 0 ? void 0 : _a.$elemMatch) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.$eq;
        const { data } = yield eventService.search({
            limit: limit,
            page: page,
            sort: {
                startDate: (req.query.sortType === String(sdk_1.chevre.factory.sortType.Descending))
                    ? sdk_1.chevre.factory.sortType.Descending
                    : sdk_1.chevre.factory.sortType.Ascending
            },
            project: { id: { $eq: req.project.id } },
            // 空文字対応(2022-07-11~)
            name: (typeof req.query.name === 'string' && req.query.name.length > 0)
                ? req.query.name
                : undefined,
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
                    $eq: (typeof ((_e = (_d = req.query.soundFormat) === null || _d === void 0 ? void 0 : _d.typeOf) === null || _e === void 0 ? void 0 : _e.$eq) === 'string'
                        && req.query.soundFormat.typeOf.$eq.length > 0)
                        ? req.query.soundFormat.typeOf.$eq
                        : undefined
                }
            },
            videoFormat: {
                typeOf: {
                    $eq: (typeof ((_g = (_f = req.query.videoFormat) === null || _f === void 0 ? void 0 : _f.typeOf) === null || _g === void 0 ? void 0 : _g.$eq) === 'string'
                        && req.query.videoFormat.typeOf.$eq.length > 0)
                        ? req.query.videoFormat.typeOf.$eq
                        : undefined
                }
            },
            workPerformed: {
                identifiers: (typeof ((_h = req.query.workPerformed) === null || _h === void 0 ? void 0 : _h.identifier) === 'string' && ((_j = req.query.workPerformed) === null || _j === void 0 ? void 0 : _j.identifier.length) > 0)
                    ? [(_k = req.query.workPerformed) === null || _k === void 0 ? void 0 : _k.identifier]
                    : undefined
            },
            additionalProperty: Object.assign({}, (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
                : undefined)
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((event) => {
                var _a, _b;
                const eventVideoFormatTypes = (Array.isArray(event.videoFormat))
                    ? event.videoFormat.map((v) => v.typeOf)
                    : [];
                let videoFormatName = '';
                if (Array.isArray(eventVideoFormatTypes)) {
                    videoFormatName = eventVideoFormatTypes.join(' ');
                }
                const additionalPropertyMatched = (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                    ? (_a = event.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === additionalPropertyElemMatchNameEq)
                    : undefined;
                return Object.assign(Object.assign(Object.assign({}, event), { videoFormatName, workPerformed: Object.assign(Object.assign({}, event.workPerformed), { 
                        // 多言語対応(2022-07-13~)
                        name: (typeof event.workPerformed.name === 'string')
                            ? event.workPerformed.name
                            : (_b = event.workPerformed.name) === null || _b === void 0 ? void 0 : _b.ja }) }), (additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined);
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
            // 空文字対応(2022-07-11~)
            name: (typeof req.query.q === 'string' && req.query.q.length > 0)
                ? req.query.q
                : undefined
        });
        res.json({
            data: searchMovieResult.data.map((d) => {
                var _a;
                // 多言語名称対応
                const movieName = (typeof d.name === 'string') ? d.name : String((_a = d.name) === null || _a === void 0 ? void 0 : _a.ja);
                return Object.assign(Object.assign({}, d), { name: movieName });
            })
        });
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
        // locationIdから施設コードへ変換しているが、施設コードで直接検索する(2022-10-01~)
        const locationId = req.query.locationId;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
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
            location: Object.assign({}, (typeof locationId === 'string') ? { id: { $eq: locationId } } : undefined),
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
    var _l, _m;
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
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    const selectedLocation = JSON.parse(req.body.location);
                    const attributes = createEventFromBody(req, { id: selectedLocation.id }, false);
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
        const event = yield eventService.findById({ id: eventId });
        let movie;
        const searchMovieResult = yield creativeWorkService.searchMovies({
            project: { id: { $eq: req.project.id } },
            identifier: { $eq: event.workPerformed.identifier }
        });
        movie = searchMovieResult.data.shift();
        if (movie === undefined) {
            throw new Error(`Movie ${event.workPerformed.identifier} Not Found`);
        }
        let mvtkFlg = 1;
        const unacceptedPaymentMethod = (_l = event.offers) === null || _l === void 0 ? void 0 : _l.unacceptedPaymentMethod;
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
        const forms = Object.assign(Object.assign(Object.assign({ additionalProperty: [], description: {}, headline: {} }, event), req.body), { nameJa: (typeof req.body.nameJa !== 'string' || req.body.nameJa.length === 0) ? event.name.ja : req.body.nameJa, nameEn: (typeof req.body.nameEn !== 'string' || req.body.nameEn.length === 0) ? event.name.en : req.body.nameEn, duration: (typeof req.body.duration !== 'string' || req.body.duration.length === 0)
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
                const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
                    limit: 1,
                    id: { $eq: event.location.id }
                });
                const movieTheater = searchMovieTheatersResult.data.shift();
                if (movieTheater === undefined) {
                    throw new Error('施設が見つかりません');
                }
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
        res.render('events/screeningEventSeries/edit', Object.assign({ message: message, errors: errors, forms: forms, translationTypes: translationType_1.translationTypes, paymentServices: searchProductsResult.data }, (movie !== undefined)
            ? {
                movie: Object.assign(Object.assign({}, movie), { 
                    // 多言語対応(2022-07-13~)
                    name: (typeof movie.name === 'string')
                        ? movie.name
                        : (_m = movie === null || movie === void 0 ? void 0 : movie.name) === null || _m === void 0 ? void 0 : _m.ja })
            }
            : undefined));
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
function createEventFromBody(req, movieTheater, isNew) {
    var _a, _b, _c, _d, _e;
    const movieIdentifier = String((_a = req.body.workPerformed) === null || _a === void 0 ? void 0 : _a.identifier);
    let videoFormat = [];
    if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
        const selectedVideoFormats = req.body.videoFormat.map((v) => JSON.parse(v));
        videoFormat = selectedVideoFormats.map((v) => {
            return { typeOf: v.codeValue, name: v.codeValue };
        });
    }
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
    let description;
    const descriptionJa = (_b = req.body.description) === null || _b === void 0 ? void 0 : _b.ja;
    const descriptionEn = (_c = req.body.description) === null || _c === void 0 ? void 0 : _c.en;
    if ((typeof descriptionJa === 'string' && descriptionJa.length > 0)
        || (typeof descriptionEn === 'string' && descriptionEn.length > 0)) {
        description = Object.assign(Object.assign({}, (typeof descriptionEn === 'string' && descriptionEn.length > 0) ? { en: descriptionEn } : undefined), (typeof descriptionJa === 'string' && descriptionJa.length > 0) ? { ja: descriptionJa } : undefined);
    }
    let headline;
    const headlineJa = (_d = req.body.headline) === null || _d === void 0 ? void 0 : _d.ja;
    const headlineEn = (_e = req.body.headline) === null || _e === void 0 ? void 0 : _e.en;
    if ((typeof headlineJa === 'string' && headlineJa.length > 0)
        || (typeof headlineEn === 'string' && headlineEn.length > 0)) {
        headline = Object.assign(Object.assign({}, (typeof headlineEn === 'string' && headlineEn.length > 0) ? { en: headlineEn } : undefined), (typeof headlineJa === 'string' && headlineJa.length > 0) ? { ja: headlineJa } : undefined);
    }
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries, name: Object.assign({ ja: req.body.nameJa }, (typeof req.body.nameEn === 'string' && req.body.nameEn.length > 0) ? { en: req.body.nameEn } : undefined), kanaName: req.body.kanaName, 
        // 最適化(2022-10-01~)
        location: {
            id: movieTheater.id
        }, videoFormat: videoFormat, soundFormat: soundFormat, 
        // 最適化(2022-10-01~)
        // workPerformed: workPerformed,
        workPerformed: { identifier: movieIdentifier }, startDate: (typeof req.body.startDate === 'string' && req.body.startDate.length > 0)
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
            : undefined, offers }, (subtitleLanguage !== undefined) ? { subtitleLanguage } : undefined), (dubLanguage !== undefined) ? { dubLanguage } : undefined), (headline !== undefined) ? { headline } : undefined), (description !== undefined) ? { description } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign(Object.assign(Object.assign({}, (subtitleLanguage === undefined) ? { subtitleLanguage: 1 } : undefined), (dubLanguage === undefined) ? { dubLanguage: 1 } : undefined), (headline === undefined) ? { headline: 1 } : undefined), (description === undefined) ? { description: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        (0, express_validator_1.body)('location')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        (0, express_validator_1.body)('workPerformed.identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コンテンツ'))
            .isString(),
        (0, express_validator_1.body)('startDate')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '開始日'))
            .isString(),
        (0, express_validator_1.body)('endDate')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '終了日'))
            .isString(),
        (0, express_validator_1.body)('nameJa')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        (0, express_validator_1.body)('nameEn')
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        (0, express_validator_1.body)('kanaName')
            .optional()
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称カナ', NAME_MAX_LENGTH_NAME))
            .isString(),
        (0, express_validator_1.body)(['headline.ja', 'headline.en'])
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_NAME))
            .isString(),
        (0, express_validator_1.body)(['description.ja', 'description.en'])
            .isLength({ max: NAME_MAX_LENGTH_DESCRIPTION })
            .withMessage(Message.Common.getMaxLength('補足説明', NAME_MAX_LENGTH_DESCRIPTION))
            .isString(),
        (0, express_validator_1.body)([
            'additionalProperty.*.name'
            // 'additionalProperty.*.value'
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
