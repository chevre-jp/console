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
 * 座席ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../../message");
// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions = require('../../../subscriptions.json');
const debug = createDebug('chevre-backend:router');
const NUM_ADDITIONAL_PROPERTY = 5;
const seatRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
seatRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    let message = '';
    let errors = {};
    const placeService = new sdk_1.chevre.service.Place({
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
                const seat = createFromBody(req, true);
                // const { data } = await placeService.searchScreeningRooms({});
                // const existingMovieTheater = data.find((d) => d.branchCode === screeningRoom.branchCode);
                // if (existingMovieTheater !== undefined) {
                //     throw new Error('コードが重複しています');
                // }
                yield preCreate(req, seat);
                yield placeService.createSeat(seat);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/places/seat/${(_c = (_b = (_a = seat.containedInPlace) === null || _a === void 0 ? void 0 : _a.containedInPlace) === null || _b === void 0 ? void 0 : _b.containedInPlace) === null || _c === void 0 ? void 0 : _c.branchCode}:${(_e = (_d = seat.containedInPlace) === null || _d === void 0 ? void 0 : _d.containedInPlace) === null || _e === void 0 ? void 0 : _e.branchCode}:${(_f = seat.containedInPlace) === null || _f === void 0 ? void 0 : _f.branchCode}:${seat.branchCode}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], name: {} }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 施設を補完
        if (typeof req.body.movieTheater === 'string' && req.body.movieTheater.length > 0) {
            forms.movieTheater = JSON.parse(req.body.movieTheater);
        }
        else {
            forms.movieTheater = undefined;
        }
        // 座席区分を補完
        if (typeof req.body.seatingType === 'string' && req.body.seatingType.length > 0) {
            forms.seatingType = JSON.parse(req.body.seatingType);
        }
        else {
            forms.seatingType = undefined;
        }
    }
    res.render('places/seat/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
seatRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('places/seat/index', {
        message: ''
    });
}));
seatRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25;
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield placeService.searchSeats({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            branchCode: {
                $regex: (typeof ((_h = (_g = req.query) === null || _g === void 0 ? void 0 : _g.branchCode) === null || _h === void 0 ? void 0 : _h.$eq) === 'string'
                    && ((_k = (_j = req.query) === null || _j === void 0 ? void 0 : _j.branchCode) === null || _k === void 0 ? void 0 : _k.$eq.length) > 0)
                    ? (_m = (_l = req.query) === null || _l === void 0 ? void 0 : _l.branchCode) === null || _m === void 0 ? void 0 : _m.$eq : undefined
            },
            containedInPlace: {
                branchCode: {
                    $eq: (typeof ((_q = (_p = (_o = req.query) === null || _o === void 0 ? void 0 : _o.containedInPlace) === null || _p === void 0 ? void 0 : _p.branchCode) === null || _q === void 0 ? void 0 : _q.$eq) === 'string'
                        && ((_t = (_s = (_r = req.query) === null || _r === void 0 ? void 0 : _r.containedInPlace) === null || _s === void 0 ? void 0 : _s.branchCode) === null || _t === void 0 ? void 0 : _t.$eq.length) > 0)
                        ? (_w = (_v = (_u = req.query) === null || _u === void 0 ? void 0 : _u.containedInPlace) === null || _v === void 0 ? void 0 : _v.branchCode) === null || _w === void 0 ? void 0 : _w.$eq : undefined
                },
                containedInPlace: {
                    branchCode: {
                        $eq: (typeof ((_0 = (_z = (_y = (_x = req.query) === null || _x === void 0 ? void 0 : _x.containedInPlace) === null || _y === void 0 ? void 0 : _y.containedInPlace) === null || _z === void 0 ? void 0 : _z.branchCode) === null || _0 === void 0 ? void 0 : _0.$eq) === 'string'
                            && ((_4 = (_3 = (_2 = (_1 = req.query) === null || _1 === void 0 ? void 0 : _1.containedInPlace) === null || _2 === void 0 ? void 0 : _2.containedInPlace) === null || _3 === void 0 ? void 0 : _3.branchCode) === null || _4 === void 0 ? void 0 : _4.$eq.length) > 0)
                            ? (_8 = (_7 = (_6 = (_5 = req.query) === null || _5 === void 0 ? void 0 : _5.containedInPlace) === null || _6 === void 0 ? void 0 : _6.containedInPlace) === null || _7 === void 0 ? void 0 : _7.branchCode) === null || _8 === void 0 ? void 0 : _8.$eq : undefined
                    },
                    containedInPlace: {
                        branchCode: {
                            $eq: (typeof ((_13 = (_12 = (_11 = (_10 = (_9 = req.query) === null || _9 === void 0 ? void 0 : _9.containedInPlace) === null || _10 === void 0 ? void 0 : _10.containedInPlace) === null || _11 === void 0 ? void 0 : _11.containedInPlace) === null || _12 === void 0 ? void 0 : _12.branchCode) === null || _13 === void 0 ? void 0 : _13.$eq) === 'string'
                                && ((_18 = (_17 = (_16 = (_15 = (_14 = req.query) === null || _14 === void 0 ? void 0 : _14.containedInPlace) === null || _15 === void 0 ? void 0 : _15.containedInPlace) === null || _16 === void 0 ? void 0 : _16.containedInPlace) === null || _17 === void 0 ? void 0 : _17.branchCode) === null || _18 === void 0 ? void 0 : _18.$eq.length) > 0)
                                ? (_23 = (_22 = (_21 = (_20 = (_19 = req.query) === null || _19 === void 0 ? void 0 : _19.containedInPlace) === null || _20 === void 0 ? void 0 : _20.containedInPlace) === null || _21 === void 0 ? void 0 : _21.containedInPlace) === null || _22 === void 0 ? void 0 : _22.branchCode) === null || _23 === void 0 ? void 0 : _23.$eq : undefined
                        }
                    }
                }
            },
            seatingType: {
                $eq: (typeof ((_24 = req.query.seatingType) === null || _24 === void 0 ? void 0 : _24.$eq) === 'string' && req.query.seatingType.$eq.length > 0)
                    ? req.query.seatingType.$eq
                    : undefined
            },
            name: {
                $regex: (typeof ((_25 = req.query.name) === null || _25 === void 0 ? void 0 : _25.$regex) === 'string' && req.query.name.$regex.length > 0)
                    ? req.query.name.$regex
                    : undefined
            }
        });
        const results = data.map((seat, index) => {
            return Object.assign(Object.assign({}, seat), { seatingTypeStr: (Array.isArray(seat.seatingType)) ? seat.seatingType.join(',') : '', id: `${seat.branchCode}:${index}` });
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
seatRouter.all('/:id/update', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _26, _27;
    try {
        let message = '';
        let errors = {};
        const splittedId = req.params.id.split(':');
        const movieTheaterBranchCode = splittedId[0];
        const screeningRoomBranchCode = splittedId[1];
        // tslint:disable-next-line:no-magic-numbers
        const screeningRoomSectionBranchCode = splittedId[2];
        // tslint:disable-next-line:no-magic-numbers
        const seatBranchCode = splittedId[3];
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
        const searchSeatsResult = yield placeService.searchSeats({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            branchCode: { $eq: seatBranchCode },
            containedInPlace: {
                branchCode: { $eq: screeningRoomSectionBranchCode },
                containedInPlace: {
                    branchCode: { $eq: screeningRoomBranchCode },
                    containedInPlace: {
                        branchCode: { $eq: movieTheaterBranchCode }
                    }
                }
            }
        });
        let seat = searchSeatsResult.data[0];
        if (seat === undefined) {
            throw new Error('Screening Room Not Found');
        }
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    seat = createFromBody(req, false);
                    debug('saving seat...', seat);
                    yield placeService.updateSeat(seat);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({ additionalProperty: [] }, seat), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // 施設を補完
            if (typeof req.body.movieTheater === 'string' && req.body.movieTheater.length > 0) {
                forms.movieTheater = JSON.parse(req.body.movieTheater);
            }
            else {
                forms.movieTheater = undefined;
            }
            // 座席区分を補完
            if (typeof req.body.seatingType === 'string' && req.body.seatingType.length > 0) {
                forms.seatingType = JSON.parse(req.body.seatingType);
            }
            else {
                forms.seatingType = undefined;
            }
        }
        else {
            forms.movieTheater = (_27 = (_26 = seat.containedInPlace) === null || _26 === void 0 ? void 0 : _26.containedInPlace) === null || _27 === void 0 ? void 0 : _27.containedInPlace;
            if (Array.isArray(seat.seatingType)) {
                const searchSeatingTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } },
                    codeValue: { $eq: seat.seatingType[0] }
                });
                forms.seatingType = searchSeatingTypesResult.data[0];
            }
            else {
                forms.seatingType = undefined;
            }
        }
        res.render('places/seat/update', {
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
seatRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const splittedId = req.params.id.split(':');
    const movieTheaterBranchCode = splittedId[0];
    const screeningRoomBranchCode = splittedId[1];
    // tslint:disable-next-line:no-magic-numbers
    const screeningRoomSectionBranchCode = splittedId[2];
    // tslint:disable-next-line:no-magic-numbers
    const seatBranchCode = splittedId[3];
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    yield placeService.deleteSeat({
        project: { id: req.project.id },
        branchCode: seatBranchCode,
        containedInPlace: {
            branchCode: screeningRoomSectionBranchCode,
            containedInPlace: {
                branchCode: screeningRoomBranchCode,
                containedInPlace: { branchCode: movieTheaterBranchCode }
            }
        }
    });
    res.status(http_status_1.NO_CONTENT)
        .end();
}));
function createFromBody(req, isNew) {
    var _a, _b;
    let seatingType;
    if (typeof req.body.seatingType === 'string' && req.body.seatingType.length > 0) {
        const selectedSeatingType = JSON.parse(req.body.seatingType);
        if (typeof selectedSeatingType.codeValue === 'string' && selectedSeatingType.codeValue.length > 0) {
            seatingType = [selectedSeatingType.codeValue];
        }
    }
    let name;
    if ((typeof ((_a = req.body.name) === null || _a === void 0 ? void 0 : _a.ja) === 'string' && req.body.name.ja.length > 0)
        || (typeof ((_b = req.body.name) === null || _b === void 0 ? void 0 : _b.en) === 'string' && req.body.name.en.length > 0)) {
        name = req.body.name;
    }
    const selecetedMovieTheater = JSON.parse(req.body.movieTheater);
    return Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.placeType.Seat, branchCode: req.body.branchCode, containedInPlace: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: sdk_1.chevre.factory.placeType.ScreeningRoomSection,
            branchCode: req.body.containedInPlace.branchCode,
            containedInPlace: {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: sdk_1.chevre.factory.placeType.ScreeningRoom,
                branchCode: req.body.containedInPlace.containedInPlace.branchCode,
                containedInPlace: {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.placeType.MovieTheater,
                    branchCode: selecetedMovieTheater.branchCode
                }
            }
        }, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined }, (name !== undefined) ? { name: req.body.name } : undefined), (Array.isArray(seatingType)) ? { seatingType: seatingType } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign({ noExistingAttributeName: 1 }, (name === undefined)
                ? { 'containsPlace.$[screeningRoom].containsPlace.$[screeningRoomSection].containsPlace.$[seat].name': 1 }
                : undefined), (seatingType === undefined)
                ? { 'containsPlace.$[screeningRoom].containsPlace.$[screeningRoomSection].containsPlace.$[seat].seatingType': 1 }
                : undefined)
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z\-]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 2, max: 12 })
            .withMessage('2~12文字で入力してください'),
        express_validator_1.body('movieTheater')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        express_validator_1.body('containedInPlace.containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ルーム')),
        express_validator_1.body('containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'セクション')),
        express_validator_1.body('name.ja')
            .optional()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        express_validator_1.body('name.en')
            .optional()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称(English)', 64))
    ];
}
function preCreate(req, seat) {
    var _a, _b, _c, _d, _e, _f;
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
            branchCode: { $eq: (_b = (_a = seat.containedInPlace) === null || _a === void 0 ? void 0 : _a.containedInPlace) === null || _b === void 0 ? void 0 : _b.branchCode },
            containedInPlace: {
                branchCode: { $eq: (_e = (_d = (_c = seat.containedInPlace) === null || _c === void 0 ? void 0 : _c.containedInPlace) === null || _d === void 0 ? void 0 : _d.containedInPlace) === null || _e === void 0 ? void 0 : _e.branchCode }
            },
            $projection: { seatCount: 1 }
        });
        const screeningRoom = searchScreeningRoomsResult.data.shift();
        if (screeningRoom === undefined) {
            throw new Error('ルームが存在しません');
        }
        const seatCount = screeningRoom.seatCount;
        if (typeof seatCount !== 'number') {
            throw new Error('座席数が不明です');
        }
        // サブスクリプションからmaximumAttendeeCapacityを取得
        const chevreProject = yield projectService.findById({ id: req.project.id });
        let subscriptionIdentifier = (_f = chevreProject.subscription) === null || _f === void 0 ? void 0 : _f.identifier;
        if (subscriptionIdentifier === undefined) {
            subscriptionIdentifier = 'Free';
        }
        const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
        const maximumAttendeeCapacitySetting = subscription === null || subscription === void 0 ? void 0 : subscription.settings.maximumAttendeeCapacity;
        // 座席数がmax以内かどうか
        if (typeof maximumAttendeeCapacitySetting === 'number') {
            if (seatCount + 1 > maximumAttendeeCapacitySetting) {
                throw new Error(`ルーム座席数の最大値は${maximumAttendeeCapacitySetting}です`);
            }
        }
    });
}
exports.default = seatRouter;
