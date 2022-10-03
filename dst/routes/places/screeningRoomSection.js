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
exports.screeningRoomSectionRouter = void 0;
/**
 * セクションルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const csvtojson = require("csvtojson");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../../factory/reservedCodeValues");
const Message = require("../../message");
const validateCsrfToken_1 = require("../../middlewares/validateCsrfToken");
// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions = require('../../../subscriptions.json');
const debug = createDebug('chevre-backend:router');
const NUM_ADDITIONAL_PROPERTY = 5;
const screeningRoomSectionRouter = (0, express_1.Router)();
exports.screeningRoomSectionRouter = screeningRoomSectionRouter;
// tslint:disable-next-line:use-default-type-parameter
screeningRoomSectionRouter.all('/new', validateCsrfToken_1.validateCsrfToken, ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let message = '';
    let errors = {};
    let csrfToken;
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                debug(req.body);
                req.body.id = '';
                const screeningRoomSection = yield createFromBody(req, true);
                yield placeService.createScreeningRoomSection(screeningRoomSection);
                // tslint:disable-next-line:no-dynamic-delete
                delete req.session.csrfSecret;
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/places/screeningRoomSection/${(_b = (_a = screeningRoomSection.containedInPlace) === null || _a === void 0 ? void 0 : _a.containedInPlace) === null || _b === void 0 ? void 0 : _b.branchCode}:${(_c = screeningRoomSection.containedInPlace) === null || _c === void 0 ? void 0 : _c.branchCode}:${screeningRoomSection.branchCode}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
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
    const forms = Object.assign(Object.assign({ additionalProperty: [], name: {} }, (typeof csrfToken === 'string') ? { csrfToken } : undefined), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 施設を補完
        if (typeof ((_d = req.body.containedInPlace) === null || _d === void 0 ? void 0 : _d.containedInPlace) === 'string'
            && req.body.containedInPlace.containedInPlace.length > 0) {
            forms.containedInPlace.containedInPlace = JSON.parse(req.body.containedInPlace.containedInPlace);
            // } else {
            //     forms.containedInPlace = undefined;
        }
    }
    res.render('places/screeningRoomSection/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
screeningRoomSectionRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('places/screeningRoomSection/index', {
        message: ''
    });
}));
screeningRoomSectionRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12;
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield placeService.searchScreeningRoomSections({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            branchCode: {
                $regex: (typeof ((_f = (_e = req.query) === null || _e === void 0 ? void 0 : _e.branchCode) === null || _f === void 0 ? void 0 : _f.$eq) === 'string'
                    && ((_h = (_g = req.query) === null || _g === void 0 ? void 0 : _g.branchCode) === null || _h === void 0 ? void 0 : _h.$eq.length) > 0)
                    ? (_k = (_j = req.query) === null || _j === void 0 ? void 0 : _j.branchCode) === null || _k === void 0 ? void 0 : _k.$eq
                    : undefined
            },
            containedInPlace: {
                branchCode: {
                    $eq: (typeof ((_o = (_m = (_l = req.query) === null || _l === void 0 ? void 0 : _l.containedInPlace) === null || _m === void 0 ? void 0 : _m.branchCode) === null || _o === void 0 ? void 0 : _o.$eq) === 'string'
                        && ((_r = (_q = (_p = req.query) === null || _p === void 0 ? void 0 : _p.containedInPlace) === null || _q === void 0 ? void 0 : _q.branchCode) === null || _r === void 0 ? void 0 : _r.$eq.length) > 0)
                        ? (_u = (_t = (_s = req.query) === null || _s === void 0 ? void 0 : _s.containedInPlace) === null || _t === void 0 ? void 0 : _t.branchCode) === null || _u === void 0 ? void 0 : _u.$eq
                        : undefined
                },
                containedInPlace: {
                    branchCode: {
                        $eq: (typeof ((_y = (_x = (_w = (_v = req.query) === null || _v === void 0 ? void 0 : _v.containedInPlace) === null || _w === void 0 ? void 0 : _w.containedInPlace) === null || _x === void 0 ? void 0 : _x.branchCode) === null || _y === void 0 ? void 0 : _y.$eq) === 'string'
                            && ((_2 = (_1 = (_0 = (_z = req.query) === null || _z === void 0 ? void 0 : _z.containedInPlace) === null || _0 === void 0 ? void 0 : _0.containedInPlace) === null || _1 === void 0 ? void 0 : _1.branchCode) === null || _2 === void 0 ? void 0 : _2.$eq.length) > 0)
                            ? (_6 = (_5 = (_4 = (_3 = req.query) === null || _3 === void 0 ? void 0 : _3.containedInPlace) === null || _4 === void 0 ? void 0 : _4.containedInPlace) === null || _5 === void 0 ? void 0 : _5.branchCode) === null || _6 === void 0 ? void 0 : _6.$eq
                            : undefined
                    }
                }
            },
            name: {
                $regex: (typeof ((_8 = (_7 = req.query) === null || _7 === void 0 ? void 0 : _7.name) === null || _8 === void 0 ? void 0 : _8.$regex) === 'string'
                    && ((_10 = (_9 = req.query) === null || _9 === void 0 ? void 0 : _9.name) === null || _10 === void 0 ? void 0 : _10.$regex.length) > 0)
                    ? (_12 = (_11 = req.query) === null || _11 === void 0 ? void 0 : _11.name) === null || _12 === void 0 ? void 0 : _12.$regex
                    : undefined
            },
            $projection: { seatCount: 1 }
        });
        const results = data.map((seat, index) => {
            return Object.assign(Object.assign({}, seat), { id: `${seat.branchCode}:${index}` });
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
// tslint:disable-next-line:use-default-type-parameter
screeningRoomSectionRouter.all('/:id/update', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _13;
    try {
        let message = '';
        let errors = {};
        const splittedId = req.params.id.split(':');
        const movieTheaterBranchCode = splittedId[0];
        const screeningRoomBranchCode = splittedId[1];
        // tslint:disable-next-line:no-magic-numbers
        const screeningRoomSectionBranchCode = splittedId[2];
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchScreeningRoomSectionsResult = yield placeService.searchScreeningRoomSections({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            branchCode: { $eq: screeningRoomSectionBranchCode },
            containedInPlace: {
                branchCode: { $eq: screeningRoomBranchCode },
                containedInPlace: {
                    branchCode: { $eq: movieTheaterBranchCode }
                }
            },
            $projection: { seatCount: 1 }
        });
        const screeningRoomSection = searchScreeningRoomSectionsResult.data[0];
        if (screeningRoomSection === undefined) {
            throw new Error('Screening Room Section Not Found');
        }
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    const originalSeatCount = screeningRoomSection.seatCount;
                    const newScreeningRoomSection = yield createFromBody(req, false);
                    yield preUpdate(req, newScreeningRoomSection, originalSeatCount);
                    yield placeService.updateScreeningRoomSection(newScreeningRoomSection);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign(Object.assign({ additionalProperty: [] }, screeningRoomSection), req.body), { containedInPlace: screeningRoomSection.containedInPlace });
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // 施設を補完
            if (typeof ((_13 = req.body.containedInPlace) === null || _13 === void 0 ? void 0 : _13.containedInPlace) === 'string'
                && req.body.containedInPlace.containedInPlace.length > 0) {
                forms.containedInPlace.containedInPlace = JSON.parse(req.body.containedInPlace.containedInPlace);
                // } else {
                //     forms.containedInPlace = undefined;
            }
        }
        res.render('places/screeningRoomSection/update', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:use-default-type-parameter
screeningRoomSectionRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const splittedId = req.params.id.split(':');
    const movieTheaterBranchCode = splittedId[0];
    const screeningRoomBranchCode = splittedId[1];
    // tslint:disable-next-line:no-magic-numbers
    const screeningRoomSectionBranchCode = splittedId[2];
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    yield placeService.deleteScreeningRoomSection({
        // project: { id: req.project.id },
        branchCode: screeningRoomSectionBranchCode,
        containedInPlace: {
            branchCode: screeningRoomBranchCode,
            containedInPlace: {
                branchCode: movieTheaterBranchCode
            }
        }
    });
    res.status(http_status_1.NO_CONTENT)
        .end();
}));
function createFromBody(req, isNew) {
    return __awaiter(this, void 0, void 0, function* () {
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSeatingTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
        });
        const seatingTypes = searchSeatingTypesResult.data;
        let containsPlace = [];
        const containsPlaceCsv = req.body.containsPlace;
        const seatBranchCodeRegex = /^[0-9a-zA-Z\-]+$/;
        if (typeof containsPlaceCsv === 'string' && containsPlaceCsv.length > 0) {
            // tslint:disable-next-line:await-promise
            const containsPlaceFronCsv = yield csvtojson()
                .fromString(containsPlaceCsv);
            if (Array.isArray(containsPlaceFronCsv)) {
                containsPlace = containsPlaceFronCsv.filter((p) => {
                    return typeof p.branchCode === 'string'
                        && p.branchCode.length > 0
                        && seatBranchCodeRegex.test(p.branchCode);
                })
                    .map((p) => {
                    var _a, _b, _c;
                    let seatingTypeCodeValue;
                    if (typeof p.seatingType === 'string') {
                        seatingTypeCodeValue = (_a = seatingTypes.find((s) => s.codeValue === p.seatingType)) === null || _a === void 0 ? void 0 : _a.codeValue;
                    }
                    const name = Object.assign(Object.assign({}, (typeof ((_b = p.name) === null || _b === void 0 ? void 0 : _b.ja) === 'string' && p.name.ja.length > 0) ? {
                        ja: String(p.name.ja)
                            // tslint:disable-next-line:no-magic-numbers
                            .slice(0, 64)
                    } : undefined), (typeof ((_c = p.name) === null || _c === void 0 ? void 0 : _c.en) === 'string' && p.name.en.length > 0) ? {
                        en: String(p.name.en)
                            // tslint:disable-next-line:no-magic-numbers
                            .slice(0, 64)
                    } : undefined);
                    return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.placeType.Seat, branchCode: String(p.branchCode)
                            // tslint:disable-next-line:no-magic-numbers
                            .slice(0, 12), seatingType: (typeof seatingTypeCodeValue === 'string') ? [seatingTypeCodeValue] : [], additionalProperty: [] }, (typeof name.ja === 'string' || typeof name.en === 'string') ? { name } : undefined);
                });
            }
        }
        const selecetedTheater = JSON.parse(req.body.containedInPlace.containedInPlace);
        return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.placeType.ScreeningRoomSection, branchCode: req.body.branchCode, name: req.body.name, containedInPlace: {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: sdk_1.chevre.factory.placeType.ScreeningRoom,
                branchCode: req.body.containedInPlace.branchCode,
                containedInPlace: {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.placeType.MovieTheater,
                    branchCode: selecetedTheater.branchCode
                }
            }, containsPlace: containsPlace, additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined }, (!isNew)
            ? {
                $unset: {
                    noExistingAttributeName: 1 // $unsetは空だとエラーになるので
                    // ...(seatingType === undefined)
                    //     ? { 'containsPlace.$[screeningRoom].containsPlace.$[screeningRoomSection].containsPlace.$[seat].seatingType': 1 }
                    //     : undefined
                }
            }
            : undefined);
    });
}
function validate() {
    return [
        (0, express_validator_1.body)('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 2, max: 12 })
            .withMessage('2~12文字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        (0, express_validator_1.body)('containedInPlace.containedInPlace')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        (0, express_validator_1.body)('containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ルーム')),
        (0, express_validator_1.body)('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        (0, express_validator_1.body)('name.en')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '英語名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語名称', 64))
    ];
}
function preUpdate(req, section, originalSeatCount) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
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
        const searchScreeningRoomsResult = yield placeService.searchScreeningRooms({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            branchCode: { $eq: (_a = section.containedInPlace) === null || _a === void 0 ? void 0 : _a.branchCode },
            containedInPlace: {
                branchCode: { $eq: (_c = (_b = section.containedInPlace) === null || _b === void 0 ? void 0 : _b.containedInPlace) === null || _c === void 0 ? void 0 : _c.branchCode }
            },
            $projection: { seatCount: 1 }
        });
        const screeningRoom = searchScreeningRoomsResult.data.shift();
        if (screeningRoom === undefined) {
            throw new Error('ルームが存在しません');
        }
        const seatCount = screeningRoom.seatCount;
        if (typeof seatCount !== 'number') {
            throw new Error('ルーム座席数が不明です');
        }
        if (typeof originalSeatCount !== 'number') {
            throw new Error('セクション座席数が不明です');
        }
        // サブスクリプションからmaximumAttendeeCapacityを取得
        const chevreProject = yield projectService.findById({ id: req.project.id });
        let subscriptionIdentifier = (_d = chevreProject.subscription) === null || _d === void 0 ? void 0 : _d.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const maximumAttendeeCapacitySetting = subscription === null || subscription === void 0 ? void 0 : subscription.settings.maximumAttendeeCapacity;
        // 座席の更新がある場合、座席数がmax以内かどうか
        if (Array.isArray(section.containsPlace) && section.containsPlace.length > 0) {
            if (typeof maximumAttendeeCapacitySetting === 'number') {
                if (seatCount - originalSeatCount + section.containsPlace.length > maximumAttendeeCapacitySetting) {
                    throw new Error(`ルーム座席数の最大値は${maximumAttendeeCapacitySetting}です`);
                }
            }
        }
    });
}
