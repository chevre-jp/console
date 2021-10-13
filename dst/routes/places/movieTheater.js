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
 * 施設ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../../message");
const debug = createDebug('chevre-console:router');
const NUM_ADDITIONAL_PROPERTY = 10;
const movieTheaterRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
movieTheaterRouter.all('/new', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                debug(req.body);
                req.body.id = '';
                let movieTheater = yield createMovieTheaterFromBody(req, true);
                const placeService = new sdk_1.chevre.service.Place({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                const { data } = yield placeService.searchMovieTheaters({
                    limit: 100,
                    project: { id: { $eq: req.project.id } }
                });
                const existingMovieTheater = data.find((d) => d.branchCode === movieTheater.branchCode);
                if (existingMovieTheater !== undefined) {
                    throw new Error('コードが重複しています');
                }
                debug('existingMovieTheater:', existingMovieTheater);
                movieTheater = yield placeService.createMovieTheater(movieTheater);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/places/movieTheater/${movieTheater.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const defaultOffers = {
        priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY,
        project: { id: req.project.id, typeOf: sdk_1.chevre.factory.organizationType.Project },
        typeOf: sdk_1.chevre.factory.offerType.Offer,
        eligibleQuantity: {
            typeOf: 'QuantitativeValue',
            maxValue: 6,
            unitCode: sdk_1.chevre.factory.unitCode.C62
        },
        availabilityStartsGraceTime: {
            typeOf: 'QuantitativeValue',
            value: -2,
            unitCode: sdk_1.chevre.factory.unitCode.Day
        },
        availabilityEndsGraceTime: {
            typeOf: 'QuantitativeValue',
            value: 1200,
            unitCode: sdk_1.chevre.factory.unitCode.Sec
        }
    };
    const forms = Object.assign({ additionalProperty: [], hasEntranceGate: [], hasPOS: [], name: {}, offers: defaultOffers }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (forms.hasEntranceGate.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.hasEntranceGate.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasEntranceGate.length)].map(() => {
            return {};
        }));
    }
    if (forms.hasPOS.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.hasPOS.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasPOS.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 親組織を補完
        if (typeof req.body.parentOrganization === 'string' && req.body.parentOrganization.length > 0) {
            forms.parentOrganization = JSON.parse(req.body.parentOrganization);
        }
        else {
            forms.parentOrganization = undefined;
        }
    }
    else {
        forms.offers = defaultOffers;
    }
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
    res.render('places/movieTheater/new', {
        message: message,
        errors: errors,
        forms: forms,
        sellers: searchSellersResult.data
    });
}));
movieTheaterRouter.get('', (_, res) => {
    res.render('places/movieTheater/index', {
        message: ''
    });
});
movieTheaterRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
        const branchCodeRegex = (_a = req.query.branchCode) === null || _a === void 0 ? void 0 : _a.$regex;
        const nameRegex = req.query.name;
        const parentOrganizationIdEq = (_b = req.query.parentOrganization) === null || _b === void 0 ? void 0 : _b.id;
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield placeService.searchMovieTheaters({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            branchCode: {
                $regex: (typeof branchCodeRegex === 'string' && branchCodeRegex.length > 0)
                    ? branchCodeRegex
                    : undefined
            },
            name: (typeof nameRegex === 'string' && nameRegex.length > 0)
                ? nameRegex
                : undefined,
            parentOrganization: {
                id: {
                    $eq: (typeof parentOrganizationIdEq === 'string' && parentOrganizationIdEq.length > 0)
                        ? parentOrganizationIdEq
                        : undefined
                }
            }
        });
        const results = data.map((movieTheater) => {
            var _a, _b, _c;
            const availabilityEndsGraceTimeInMinutes = (typeof ((_b = (_a = movieTheater.offers) === null || _a === void 0 ? void 0 : _a.availabilityEndsGraceTime) === null || _b === void 0 ? void 0 : _b.value) === 'number')
                // tslint:disable-next-line:no-magic-numbers
                ? Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60)
                : undefined;
            const seller = searchSellersResult.data.find((s) => { var _a; return s.id === ((_a = movieTheater.parentOrganization) === null || _a === void 0 ? void 0 : _a.id); });
            return Object.assign(Object.assign({}, movieTheater), { parentOrganizationName: (typeof (seller === null || seller === void 0 ? void 0 : seller.name) === 'string')
                    ? seller === null || seller === void 0 ? void 0 : seller.name : String((_c = seller === null || seller === void 0 ? void 0 : seller.name) === null || _c === void 0 ? void 0 : _c.ja), posCount: (Array.isArray(movieTheater.hasPOS)) ? movieTheater.hasPOS.length : 0, availabilityStartsGraceTimeInDays: (movieTheater.offers !== undefined
                    && movieTheater.offers.availabilityStartsGraceTime !== undefined
                    && movieTheater.offers.availabilityStartsGraceTime.value !== undefined)
                    // tslint:disable-next-line:no-magic-numbers
                    ? -movieTheater.offers.availabilityStartsGraceTime.value
                    : undefined, availabilityEndsGraceTimeInMinutes: (availabilityEndsGraceTimeInMinutes !== undefined)
                    ? (availabilityEndsGraceTimeInMinutes >= 0)
                        ? `${availabilityEndsGraceTimeInMinutes}分後`
                        : `${-availabilityEndsGraceTimeInMinutes}分前`
                    : undefined });
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: results
        });
    }
    catch (err) {
        res.json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
movieTheaterRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const movieTheater = yield placeService.findMovieTheaterById({ id: req.params.id });
        yield preDelete(req, movieTheater);
        yield placeService.deleteMovieTheater({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, movieTheater) {
    return __awaiter(this, void 0, void 0, function* () {
        // 施設コンテンツが存在するかどうか
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchEventsResult = yield eventService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
            location: { branchCode: { $eq: movieTheater.branchCode } }
        });
        if (searchEventsResult.data.length > 0) {
            throw new Error('関連する施設コンテンツが存在します');
        }
    });
}
// tslint:disable-next-line:use-default-type-parameter
movieTheaterRouter.all('/:id/update', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    let message = '';
    let errors = {};
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    let movieTheater = yield placeService.findMovieTheaterById({
        id: req.params.id
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                req.body.id = req.params.id;
                movieTheater = yield createMovieTheaterFromBody(req, false);
                debug('saving an movie theater...', movieTheater);
                yield placeService.updateMovieTheater(movieTheater);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign({ additionalProperty: [], hasEntranceGate: [], hasPOS: [] }, movieTheater), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (forms.hasEntranceGate.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.hasEntranceGate.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasEntranceGate.length)].map(() => {
            return {};
        }));
    }
    if (forms.hasPOS.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.hasPOS.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasPOS.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 親組織を補完
        if (typeof req.body.parentOrganization === 'string' && req.body.parentOrganization.length > 0) {
            forms.parentOrganization = JSON.parse(req.body.parentOrganization);
        }
        else {
            forms.parentOrganization = undefined;
        }
    }
    else {
        forms.offers = movieTheater.offers;
        if (typeof ((_c = movieTheater.parentOrganization) === null || _c === void 0 ? void 0 : _c.id) === 'string') {
            const seller = yield sellerService.findById({
                id: movieTheater.parentOrganization.id
            });
            forms.parentOrganization = { id: seller.id, name: seller.name };
        }
        else {
            forms.parentOrganization = undefined;
        }
    }
    const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
    res.render('places/movieTheater/update', {
        message: message,
        errors: errors,
        forms: forms,
        sellers: searchSellersResult.data
    });
}));
movieTheaterRouter.get('/:id/screeningRooms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const movieTheater = yield placeService.findMovieTheaterById({
            id: req.params.id
        });
        const screeningRooms = movieTheater.containsPlace.map((screen) => {
            let numSeats = 0;
            if (Array.isArray(screen.containsPlace)) {
                numSeats += screen.containsPlace.reduce((a, b) => {
                    return a + ((b.containsPlace !== undefined) ? b.containsPlace.length : 0);
                }, 0);
            }
            return Object.assign(Object.assign({}, screen), { name: screen.name !== undefined
                    ? (typeof screen.name === 'string') ? screen.name : screen.name.ja
                    : '', numSeats: numSeats });
        });
        screeningRooms.sort((screen1, screen2) => {
            if (typeof screen1.name === 'string' && screen2.name === 'strring') {
                if (screen1.name > screen2.name) {
                    return 1;
                }
                if (screen1.name < screen2.name) {
                    return -1;
                }
            }
            return 0;
        });
        res.json({
            success: true,
            results: screeningRooms
        });
    }
    catch (err) {
        res.json({
            success: false,
            message: err.message,
            results: []
        });
    }
}));
// tslint:disable-next-line:max-func-body-length
function createMovieTheaterFromBody(req, isNew) {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function* () {
        const selectedSeller = JSON.parse(req.body.parentOrganization);
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const seller = yield sellerService.findById({ id: selectedSeller.id });
        const parentOrganization = {
            typeOf: seller.typeOf,
            id: seller.id
        };
        let hasPOS = [];
        if (Array.isArray(req.body.hasPOS)) {
            hasPOS = req.body.hasPOS.filter((p) => typeof p.id === 'string' && p.id.length > 0
                && typeof p.name === 'string' && p.name.length > 0)
                .map((p) => {
                return {
                    id: String(p.id),
                    name: String(p.name)
                };
            });
        }
        let hasEntranceGate = [];
        if (Array.isArray(req.body.hasEntranceGate)) {
            hasEntranceGate = req.body.hasEntranceGate.filter((p) => {
                var _a;
                return typeof p.identifier === 'string' && p.identifier.length > 0
                    && typeof ((_a = p.name) === null || _a === void 0 ? void 0 : _a.ja) === 'string' && p.name.ja.length > 0;
            })
                .map((p) => {
                var _a;
                return {
                    typeOf: 'Place',
                    identifier: String(p.identifier),
                    name: Object.assign({ ja: String(p.name.ja) }, (typeof ((_a = p.name) === null || _a === void 0 ? void 0 : _a.en) === 'string' && p.name.en.length > 0) ? { en: String(p.name.en) } : undefined)
                };
            });
        }
        const url = (typeof req.body.url === 'string' && req.body.url.length > 0) ? req.body.url : undefined;
        const offers = {
            priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY,
            project: { id: req.project.id, typeOf: sdk_1.chevre.factory.organizationType.Project },
            typeOf: sdk_1.chevre.factory.offerType.Offer,
            eligibleQuantity: Object.assign({ typeOf: 'QuantitativeValue', unitCode: sdk_1.chevre.factory.unitCode.C62 }, (typeof ((_b = (_a = req.body.offers) === null || _a === void 0 ? void 0 : _a.eligibleQuantity) === null || _b === void 0 ? void 0 : _b.maxValue) === 'number')
                ? { maxValue: req.body.offers.eligibleQuantity.maxValue }
                : undefined),
            availabilityStartsGraceTime: Object.assign({ typeOf: 'QuantitativeValue', unitCode: sdk_1.chevre.factory.unitCode.Day }, (typeof ((_d = (_c = req.body.offers) === null || _c === void 0 ? void 0 : _c.availabilityStartsGraceTime) === null || _d === void 0 ? void 0 : _d.value) === 'number')
                ? { value: req.body.offers.availabilityStartsGraceTime.value }
                : undefined),
            availabilityEndsGraceTime: Object.assign({ typeOf: 'QuantitativeValue', unitCode: sdk_1.chevre.factory.unitCode.Sec }, (typeof ((_f = (_e = req.body.offers) === null || _e === void 0 ? void 0 : _e.availabilityEndsGraceTime) === null || _f === void 0 ? void 0 : _f.value) === 'number')
                ? { value: req.body.offers.availabilityEndsGraceTime.value }
                : undefined)
        };
        // tslint:disable-next-line:no-unnecessary-local-variable
        const movieTheater = Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, id: req.body.id, typeOf: sdk_1.chevre.factory.placeType.MovieTheater, branchCode: req.body.branchCode, name: req.body.name, kanaName: req.body.kanaName, hasEntranceGate: hasEntranceGate, hasPOS: hasPOS, offers: offers, parentOrganization: parentOrganization, telephone: req.body.telephone, screenCount: 0, additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name.length > 0)
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined }, (typeof url === 'string') ? { url: url } : undefined), (!isNew)
            ? {
                $unset: Object.assign({}, (url === undefined) ? { url: 1 } : undefined)
            }
            : undefined);
        return movieTheater;
    });
}
function validate() {
    return [
        express_validator_1.body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12)),
        express_validator_1.body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        express_validator_1.body('parentOrganization')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '親組織')),
        express_validator_1.body('offers.eligibleQuantity.maxValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '販売上限席数'))
            .isInt()
            .toInt(),
        express_validator_1.body('offers.availabilityStartsGraceTime.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '販売開始設定'))
            .isInt()
            .toInt(),
        express_validator_1.body('offers.availabilityEndsGraceTime.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '販売終了設定'))
            .isInt()
            .toInt(),
        express_validator_1.body('hasPOS')
            .optional()
            .isArray()
            .custom((value) => {
            // POSコードの重複確認
            const posCodes = value
                .filter((p) => String(p.id).length > 0)
                .map((p) => p.id);
            const posCodesAreUnique = posCodes.length === [...new Set(posCodes)].length;
            if (!posCodesAreUnique) {
                throw new Error('POSコードが重複しています');
            }
            return true;
        }),
        express_validator_1.body('hasPOS.*.id')
            .optional()
            .if((value) => String(value).length > 0)
            .isString()
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage(() => '英数字で入力してください')
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12)),
        express_validator_1.body('hasPOS.*.name')
            .optional()
            .if((value) => String(value).length > 0)
            .isString()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        express_validator_1.body('hasEntranceGate')
            .optional()
            .isArray()
            .custom((value) => {
            // 入場ゲートコードの重複確認
            const identifiers = value
                .filter((p) => String(p.identifier).length > 0)
                .map((p) => p.identifier);
            const identifiersAreUnique = identifiers.length === [...new Set(identifiers)].length;
            if (!identifiersAreUnique) {
                throw new Error('入場ゲートコードが重複しています');
            }
            return true;
        }),
        express_validator_1.body('hasEntranceGate.*.identifier')
            .optional()
            .if((value) => String(value).length > 0)
            .isString()
            .matches(/^[0-9a-zA-Z_]+$/)
            .withMessage(() => '英数字で入力してください')
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12))
    ];
}
exports.default = movieTheaterRouter;
