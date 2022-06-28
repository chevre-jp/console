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
 * コンテンツコントローラー
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const Message = require("../../message");
const debug = createDebug('chevre-backend:routes');
const THUMBNAIL_URL_MAX_LENGTH = 256;
const ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH = (process.env.ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH !== undefined)
    ? Number(process.env.ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH)
    // tslint:disable-next-line:no-magic-numbers
    : 256;
const NUM_ADDITIONAL_PROPERTY = 5;
// コンテンツコード 半角64
const NAME_MAX_LENGTH_CODE = 64;
// コンテンツ名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// コンテンツ名・英語 半角128
// const NAME_MAX_LENGTH_NAME_EN: number = 128;
// 上映時間・数字10
const NAME_MAX_LENGTH_NAME_MINUTES = 10;
const movieRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
movieRouter.all('/add', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                req.body.id = '';
                let movie = yield createFromBody(req, true);
                const { data } = yield creativeWorkService.searchMovies({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    identifier: { $eq: movie.identifier }
                });
                if (data.length > 0) {
                    throw new Error('既に存在するコードです');
                }
                debug('saving an movie...', movie);
                movie = yield creativeWorkService.createMovie(movie);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/creativeWorks/movie/${movie.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [] }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // レイティングを保管
        if (typeof req.body.contentRating === 'string' && req.body.contentRating.length > 0) {
            forms.contentRating = JSON.parse(req.body.contentRating);
        }
        else {
            forms.contentRating = undefined;
        }
        // 配給を保管
        if (typeof req.body.distributor === 'string' && req.body.distributor.length > 0) {
            forms.distributor = JSON.parse(req.body.distributor);
        }
        else {
            forms.distributor = undefined;
        }
    }
    res.render('creativeWorks/movie/add', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
movieRouter.get('', (__, res) => {
    res.render('creativeWorks/movie/index', {});
});
movieRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield creativeWorkService.searchMovies({
            limit: limit,
            page: page,
            sort: {
                identifier: (req.query.sortType === String(sdk_1.chevre.factory.sortType.Descending))
                    ? sdk_1.chevre.factory.sortType.Descending
                    : sdk_1.chevre.factory.sortType.Ascending
            },
            project: { id: { $eq: req.project.id } },
            contentRating: {
                $eq: (typeof ((_a = req.query.contentRating) === null || _a === void 0 ? void 0 : _a.$eq) === 'string' && req.query.contentRating.$eq.length > 0)
                    ? req.query.contentRating.$eq
                    : undefined
            },
            distributor: {
                codeValue: {
                    $eq: (typeof ((_c = (_b = req.query.distributor) === null || _b === void 0 ? void 0 : _b.codeValue) === null || _c === void 0 ? void 0 : _c.$eq) === 'string' && req.query.distributor.codeValue.$eq.length > 0)
                        ? req.query.distributor.codeValue.$eq
                        : undefined
                }
            },
            identifier: req.query.identifier,
            name: req.query.name,
            datePublishedFrom: (typeof req.query.datePublishedFrom === 'string' && req.query.datePublishedFrom.length > 0)
                ? moment(`${req.query.datePublishedFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            datePublishedThrough: (typeof req.query.datePublishedThrough === 'string' && req.query.datePublishedThrough.length > 0)
                ? moment(`${req.query.datePublishedThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            offers: {
                availableFrom: (typeof req.query.availableFrom === 'string' && req.query.availableFrom.length > 0)
                    ? moment(`${req.query.availableFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'second')
                        .toDate()
                    : undefined,
                availableThrough: (typeof req.query.availableThrough === 'string' && req.query.availableThrough.length > 0) ?
                    moment(`${req.query.availableThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((d) => {
                var _a;
                const thumbnailUrlStr = (typeof d.thumbnailUrl === 'string') ? d.thumbnailUrl : '$thumbnailUrl$';
                const name = (typeof d.name === 'string')
                    ? d.name
                    : (typeof ((_a = d.name) === null || _a === void 0 ? void 0 : _a.ja) === 'string') ? d.name.ja : '';
                return Object.assign(Object.assign({}, d), { name,
                    thumbnailUrlStr });
            })
        });
    }
    catch (error) {
        res.json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
movieRouter.all('/:id/update', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e;
    const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
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
    let movie = yield creativeWorkService.findMovieById({
        id: req.params.id
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        console.error(errors);
        if (validatorResult.isEmpty()) {
            try {
                req.body.id = req.params.id;
                movie = yield createFromBody(req, false);
                debug('saving an movie...', movie);
                yield creativeWorkService.updateMovie(movie);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign(Object.assign(Object.assign({ additionalProperty: [] }, movie), { distribution: (movie.distributor !== undefined) ? movie.distributor.id : '' }), req.body), { duration: (typeof req.body.duration !== 'string')
            ? (typeof movie.duration === 'string') ? moment.duration(movie.duration)
                .asMinutes() : ''
            : req.body.duration, datePublished: (typeof req.body.datePublished !== 'string')
            ? (movie.datePublished !== undefined) ? moment(movie.datePublished)
                .tz('Asia/Tokyo')
                .format('YYYY/MM/DD') : ''
            : req.body.datePublished, offers: (typeof ((_d = req.body.offers) === null || _d === void 0 ? void 0 : _d.availabilityEnds) !== 'string')
            ? (movie.offers !== undefined && movie.offers.availabilityEnds !== undefined)
                ? {
                    availabilityEnds: moment(movie.offers.availabilityEnds)
                        .add(-1, 'day')
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                }
                : undefined
            : req.body.offers });
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // レイティングを保管
        if (typeof req.body.contentRating === 'string' && req.body.contentRating.length > 0) {
            forms.contentRating = JSON.parse(req.body.contentRating);
        }
        else {
            forms.contentRating = undefined;
        }
        // 配給を保管
        if (typeof req.body.distributor === 'string' && req.body.distributor.length > 0) {
            forms.distributor = JSON.parse(req.body.distributor);
        }
        else {
            forms.distributor = undefined;
        }
    }
    else {
        if (typeof movie.contentRating === 'string') {
            const searchContentRatingsResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType } },
                codeValue: { $eq: movie.contentRating }
            });
            forms.contentRating = searchContentRatingsResult.data[0];
        }
        else {
            forms.contentRating = undefined;
        }
        if (typeof ((_e = movie.distributor) === null || _e === void 0 ? void 0 : _e.codeValue) === 'string') {
            const searchDistributorTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.DistributorType } },
                codeValue: { $eq: movie.distributor.codeValue }
            });
            forms.distributor = searchDistributorTypesResult.data[0];
        }
        else {
            forms.distributor = undefined;
        }
    }
    res.render('creativeWorks/movie/edit', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
movieRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // validation
        const movie = yield creativeWorkService.findMovieById({ id: req.params.id });
        yield preDelete(req, movie);
        yield creativeWorkService.deleteMovie({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, movie) {
    return __awaiter(this, void 0, void 0, function* () {
        // 施設コンテンツが存在するかどうか
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchEventSeriesResult = yield eventService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
            workPerformed: {
                identifiers: [movie.identifier]
            }
        });
        if (searchEventSeriesResult.data.length > 0) {
            throw new Error('関連する施設コンテンツが存在します');
        }
        // イベントが存在するかどうか
        const searchEventsResult = yield eventService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
            superEvent: {
                workPerformedIdentifiers: [movie.identifier]
            }
        });
        if (searchEventsResult.data.length > 0) {
            throw new Error('関連するイベントが存在します');
        }
    });
}
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let contentRating;
        if (typeof req.body.contentRating === 'string' && req.body.contentRating.length > 0) {
            const selectedContenRating = JSON.parse(req.body.contentRating);
            contentRating = selectedContenRating.codeValue;
        }
        let duration;
        if (typeof req.body.duration === 'string' && req.body.duration.length > 0) {
            duration = moment.duration(Number(req.body.duration), 'm')
                .toISOString();
        }
        let headline;
        if (typeof req.body.headline === 'string' && req.body.headline.length > 0) {
            headline = req.body.headline;
        }
        let datePublished;
        if (typeof req.body.datePublished === 'string' && req.body.datePublished.length > 0) {
            datePublished = moment(`${req.body.datePublished}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate();
        }
        let availabilityEnds;
        if (typeof ((_a = req.body.offers) === null || _a === void 0 ? void 0 : _a.availabilityEnds) === 'string' && ((_b = req.body.offers) === null || _b === void 0 ? void 0 : _b.availabilityEnds.length) > 0) {
            availabilityEnds = moment(`${(_c = req.body.offers) === null || _c === void 0 ? void 0 : _c.availabilityEnds}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .add(1, 'day')
                .toDate();
        }
        const offers = Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.offerType.Offer, priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY }, (availabilityEnds !== undefined) ? { availabilityEnds } : undefined);
        let distributor;
        if (typeof req.body.distributor === 'string' && req.body.distributor.length > 0) {
            const selectedDistributor = JSON.parse(req.body.distributor);
            const searchDistributorTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.DistributorType } },
                codeValue: { $eq: selectedDistributor.codeValue }
            });
            const distributorType = searchDistributorTypesResult.data.shift();
            if (distributorType === undefined) {
                throw new Error('配給区分が見つかりません');
            }
            distributor = Object.assign({ id: distributorType.id, codeValue: distributorType.codeValue }, {
                // 互換性維持対応
                distributorType: distributorType.codeValue
            });
        }
        const thumbnailUrl = (typeof req.body.thumbnailUrl === 'string' && req.body.thumbnailUrl.length > 0) ? req.body.thumbnailUrl : undefined;
        const movie = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.creativeWorkType.Movie, id: req.body.id, identifier: req.body.identifier, name: req.body.name, offers: offers, additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined }, (contentRating !== undefined) ? { contentRating } : undefined), (duration !== undefined) ? { duration } : undefined), (headline !== undefined) ? { headline } : undefined), (datePublished !== undefined) ? { datePublished } : undefined), (distributor !== undefined) ? { distributor } : undefined), (typeof thumbnailUrl === 'string') ? { thumbnailUrl } : undefined), (!isNew)
            ? {
                $unset: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (contentRating === undefined) ? { contentRating: 1 } : undefined), (duration === undefined) ? { duration: 1 } : undefined), (headline === undefined) ? { headline: 1 } : undefined), (datePublished === undefined) ? { datePublished: 1 } : undefined), (distributor === undefined) ? { distributor: 1 } : undefined), (typeof thumbnailUrl !== 'string') ? { thumbnailUrl: 1 } : undefined)
            }
            : undefined);
        if (movie.offers !== undefined
            && movie.offers.availabilityEnds !== undefined
            && movie.datePublished !== undefined
            && movie.offers.availabilityEnds <= movie.datePublished) {
            throw new Error('興行終了予定日が公開日よりも前です');
        }
        return movie;
    });
}
/**
 * コンテンツバリデーション
 */
function validate() {
    return [
        express_validator_1.body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .isLength({ max: 32 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 32)),
        express_validator_1.body('name')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE)),
        express_validator_1.body('duration')
            .optional()
            .isNumeric()
            .isLength({ max: NAME_MAX_LENGTH_NAME_MINUTES })
            .withMessage(Message.Common.getMaxLengthHalfByte('上映時間', NAME_MAX_LENGTH_NAME_MINUTES)),
        express_validator_1.body('headline')
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_CODE)),
        express_validator_1.body('thumbnailUrl')
            .optional()
            .if((value) => typeof value === 'string' && value.length > 0)
            .isURL()
            .withMessage('URLを入力してください')
            .isLength({ max: THUMBNAIL_URL_MAX_LENGTH })
            .withMessage(Message.Common.getMaxLength('サムネイルURL', THUMBNAIL_URL_MAX_LENGTH)),
        express_validator_1.body('additionalProperty.*.name')
            .optional()
            .if((value) => String(value).length > 0)
            .isString()
            .isLength({ max: ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH }),
        express_validator_1.body('additionalProperty.*.value')
            .if((value) => String(value).length > 0)
            .isString()
            .isLength({ max: ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH })
        // colName = '公開日';
        // body('datePublished')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));
        // colName = '興行終了予定日';
        // body('offers.availabilityEnds')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));
    ];
}
exports.default = movieRouter;
