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
exports.screeningRoomRouter = void 0;
/**
 * ルームルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../../factory/reservedCodeValues");
const Message = require("../../message");
const validateCsrfToken_1 = require("../../middlewares/validateCsrfToken");
const debug = createDebug('chevre-backend:router');
const NUM_ADDITIONAL_PROPERTY = 5;
const screeningRoomRouter = (0, express_1.Router)();
exports.screeningRoomRouter = screeningRoomRouter;
// tslint:disable-next-line:use-default-type-parameter
screeningRoomRouter.all('/new', validateCsrfToken_1.validateCsrfToken, ...validate(true), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
                const screeningRoom = createFromBody(req, true);
                yield placeService.createScreeningRoom(screeningRoom);
                // tslint:disable-next-line:no-dynamic-delete
                delete req.session.csrfSecret;
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/places/screeningRoom/${(_a = screeningRoom.containedInPlace) === null || _a === void 0 ? void 0 : _a.branchCode}:${screeningRoom.branchCode}/update`);
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
        if (typeof req.body.containedInPlace === 'string' && req.body.containedInPlace.length > 0) {
            forms.containedInPlace = JSON.parse(req.body.containedInPlace);
        }
        else {
            forms.containedInPlace = undefined;
        }
    }
    res.render('places/screeningRoom/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
screeningRoomRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('places/screeningRoom/index', {
        message: ''
    });
}));
screeningRoomRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const additionalPropertyElemMatchNameEq = (_d = (_c = (_b = req.query.additionalProperty) === null || _b === void 0 ? void 0 : _b.$elemMatch) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.$eq;
        const { data } = yield placeService.searchScreeningRooms(Object.assign(Object.assign({ limit: limit, page: page, project: { id: { $eq: req.project.id } }, branchCode: {
                $regex: (typeof ((_f = (_e = req.query) === null || _e === void 0 ? void 0 : _e.branchCode) === null || _f === void 0 ? void 0 : _f.$regex) === 'string'
                    && ((_h = (_g = req.query) === null || _g === void 0 ? void 0 : _g.branchCode) === null || _h === void 0 ? void 0 : _h.$regex.length) > 0)
                    ? (_k = (_j = req.query) === null || _j === void 0 ? void 0 : _j.branchCode) === null || _k === void 0 ? void 0 : _k.$regex
                    : undefined
            }, containedInPlace: {
                id: {
                    $eq: (typeof ((_o = (_m = (_l = req.query) === null || _l === void 0 ? void 0 : _l.containedInPlace) === null || _m === void 0 ? void 0 : _m.id) === null || _o === void 0 ? void 0 : _o.$eq) === 'string'
                        && ((_p = req.query) === null || _p === void 0 ? void 0 : _p.containedInPlace.id.$eq.length) > 0)
                        ? (_q = req.query) === null || _q === void 0 ? void 0 : _q.containedInPlace.id.$eq
                        : undefined
                },
                branchCode: {
                    $eq: (typeof ((_t = (_s = (_r = req.query) === null || _r === void 0 ? void 0 : _r.containedInPlace) === null || _s === void 0 ? void 0 : _s.branchCode) === null || _t === void 0 ? void 0 : _t.$eq) === 'string'
                        && ((_w = (_v = (_u = req.query) === null || _u === void 0 ? void 0 : _u.containedInPlace) === null || _v === void 0 ? void 0 : _v.branchCode) === null || _w === void 0 ? void 0 : _w.$eq.length) > 0)
                        ? (_z = (_y = (_x = req.query) === null || _x === void 0 ? void 0 : _x.containedInPlace) === null || _y === void 0 ? void 0 : _y.branchCode) === null || _z === void 0 ? void 0 : _z.$eq
                        : undefined
                }
            }, name: {
                $regex: (typeof ((_1 = (_0 = req.query) === null || _0 === void 0 ? void 0 : _0.name) === null || _1 === void 0 ? void 0 : _1.$regex) === 'string'
                    && ((_3 = (_2 = req.query) === null || _2 === void 0 ? void 0 : _2.name) === null || _3 === void 0 ? void 0 : _3.$regex.length) > 0)
                    ? (_5 = (_4 = req.query) === null || _4 === void 0 ? void 0 : _4.name) === null || _5 === void 0 ? void 0 : _5.$regex
                    : undefined
            }, openSeatingAllowed: (req.query.openSeatingAllowed === '1') ? true : undefined }, (req.query.$projection !== undefined && req.query.$projection !== null)
            ? {
                $projection: req.query.$projection
            }
            : { $projection: { seatCount: 1 } }), { additionalProperty: Object.assign({}, (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
                : undefined) }));
        const results = data.map((screeningRoom) => {
            var _a;
            const additionalPropertyMatched = (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                ? (_a = screeningRoom.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === additionalPropertyElemMatchNameEq)
                : undefined;
            return Object.assign(Object.assign(Object.assign({}, screeningRoom), { openSeatingAllowedStr: (screeningRoom.openSeatingAllowed === true) ? 'done' : undefined }), (additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined);
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
            message: err.message,
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
screeningRoomRouter.all('/:id/update', ...validate(false), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const splittedId = req.params.id.split(':');
    const movieTheaterBranchCode = splittedId[0];
    const screeningRoomBranchCode = splittedId[1];
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchScreeningRoomsResult = yield placeService.searchScreeningRooms({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        branchCode: { $eq: screeningRoomBranchCode },
        containedInPlace: {
            branchCode: { $eq: movieTheaterBranchCode }
        }
    });
    let screeningRoom = searchScreeningRoomsResult.data[0];
    if (screeningRoom === undefined) {
        throw new Error('Screening Room Not Found');
    }
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                screeningRoom = createFromBody(req, false);
                debug('saving screeningRoom...', screeningRoom);
                yield placeService.updateScreeningRoom(screeningRoom);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign({ additionalProperty: [] }, screeningRoom), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 施設を補完
        if (typeof req.body.containedInPlace === 'string' && req.body.containedInPlace.length > 0) {
            forms.containedInPlace = JSON.parse(req.body.containedInPlace);
        }
        else {
            forms.containedInPlace = undefined;
        }
    }
    res.render('places/screeningRoom/update', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
// tslint:disable-next-line:use-default-type-parameter
screeningRoomRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const splittedId = req.params.id.split(':');
        const movieTheaterBranchCode = splittedId[0];
        const screeningRoomBranchCode = splittedId[1];
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchScreeningRoomsResult = yield placeService.searchScreeningRooms({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            branchCode: { $eq: screeningRoomBranchCode },
            containedInPlace: {
                branchCode: { $eq: movieTheaterBranchCode }
            }
        });
        const screeningRoom = searchScreeningRoomsResult.data[0];
        if (screeningRoom === undefined) {
            throw new Error('Screening Room Not Found');
        }
        yield preDelete(req, screeningRoom);
        yield placeService.deleteScreeningRoom({
            // project: { id: req.project.id },
            branchCode: screeningRoomBranchCode,
            containedInPlace: { branchCode: movieTheaterBranchCode }
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, screeningRoom) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // スケジュールが存在するかどうか
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchEventsResult = yield eventService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
            eventStatuses: [
                sdk_1.chevre.factory.eventStatusType.EventPostponed,
                sdk_1.chevre.factory.eventStatusType.EventRescheduled,
                sdk_1.chevre.factory.eventStatusType.EventScheduled
            ],
            location: { branchCode: { $eq: screeningRoom.branchCode } },
            superEvent: {
                location: { id: { $eq: (_a = screeningRoom.containedInPlace) === null || _a === void 0 ? void 0 : _a.id } }
            }
        });
        if (searchEventsResult.data.length > 0) {
            throw new Error('関連するスケジュールが存在します');
        }
    });
}
function createFromBody(req, isNew) {
    let openSeatingAllowed;
    if (req.body.openSeatingAllowed === '1') {
        openSeatingAllowed = true;
    }
    const selectedContainedInPlace = JSON.parse(req.body.containedInPlace);
    return Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.placeType.ScreeningRoom, branchCode: req.body.branchCode, name: req.body.name, address: req.body.address, containedInPlace: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: sdk_1.chevre.factory.placeType.MovieTheater,
            branchCode: selectedContainedInPlace.branchCode
        }, 
        // containsPlace: [], // 更新しないため空でよし
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined }, (typeof openSeatingAllowed === 'boolean')
        ? { openSeatingAllowed: openSeatingAllowed }
        : undefined), (!isNew)
        ? {
            $unset: Object.assign({ noExistingAttributeName: 1 }, (openSeatingAllowed === undefined) ? { 'containsPlace.$[screeningRoom].openSeatingAllowed': 1 } : undefined)
        }
        : undefined);
}
function validate(isNew) {
    return [
        (0, express_validator_1.body)('containedInPlace')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        ...(isNew)
            ? [
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
                    .withMessage('予約語のため使用できません')
            ]
            : [
                (0, express_validator_1.body)('branchCode')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .matches(/^[0-9a-zA-Z]+$/)
                    .withMessage('半角英数字で入力してください')
                    .isLength({ min: 1, max: 12 })
                    .withMessage('1~12文字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
            ],
        (0, express_validator_1.body)('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        (0, express_validator_1.body)('additionalProperty.*.name')
            .optional()
            .if((value) => String(value).length > 0)
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}
