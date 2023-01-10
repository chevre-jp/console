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
exports.busStopRouter = void 0;
/**
 * ターミナルルーター
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
const debug = createDebug('chevre-console:router');
const NUM_ADDITIONAL_PROPERTY = 10;
const busStopRouter = (0, express_1.Router)();
exports.busStopRouter = busStopRouter;
// tslint:disable-next-line:use-default-type-parameter
busStopRouter.all('/new', validateCsrfToken_1.validateCsrfToken, ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    let csrfToken;
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                debug(req.body);
                req.body.id = '';
                let busStop = yield createFromBody(req, true);
                const placeService = new sdk_1.chevre.service.Place({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                busStop = yield placeService.createBusStop(busStop);
                // tslint:disable-next-line:no-dynamic-delete
                delete req.session.csrfSecret;
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/places/busStop/${busStop.id}/update`);
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
        // no op
    }
    else {
        // no op
    }
    res.render('places/busStop/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
busStopRouter.get('', (_, res) => {
    res.render('places/busStop/index', {
        message: ''
    });
});
busStopRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const branchCodeRegex = (_a = req.query.branchCode) === null || _a === void 0 ? void 0 : _a.$regex;
        const nameRegex = req.query.name;
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        // const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
        const { data } = yield placeService.searchBusStops({
            limit: limit,
            page: page,
            sort: { branchCode: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            branchCode: {
                $regex: (typeof branchCodeRegex === 'string' && branchCodeRegex.length > 0)
                    ? branchCodeRegex
                    : undefined
            },
            name: (typeof nameRegex === 'string' && nameRegex.length > 0)
                ? { $regex: nameRegex }
                : undefined
        });
        const results = data.map((busStop) => {
            // const additionalPropertyMatched =
            //     (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
            //         ? movieTheater.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
            //         : undefined;
            return Object.assign({}, busStop
            // ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
            );
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
busStopRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchBusStopsResult = yield placeService.searchBusStops({
            limit: 1,
            id: { $eq: req.params.id }
        });
        const busStop = searchBusStopsResult.data.shift();
        if (busStop === undefined) {
            throw new Error('ターミナルが見つかりません');
        }
        yield preDelete(req, busStop);
        yield placeService.deleteBusStop({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(__, __2) {
    return __awaiter(this, void 0, void 0, function* () {
        // トリップが存在するかどうか
        // const eventService = new chevre.service.Event({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient,
        //     project: { id: req.project.id }
        // });
        // const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
        //     limit: 1,
        //     project: { id: { $eq: req.project.id } },
        //     typeOf: chevre.factory.eventType.ScreeningEventSeries,
        //     location: { branchCode: { $eq: busStop.branchCode } }
        // });
        // if (searchEventsResult.data.length > 0) {
        //     throw new Error('関連する施設コンテンツが存在します');
        // }
    });
}
// tslint:disable-next-line:use-default-type-parameter
busStopRouter.all('/:id/update', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const placeService = new sdk_1.chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchBusStopsResult = yield placeService.searchBusStops({ limit: 1, id: { $eq: req.params.id } });
    let busStop = searchBusStopsResult.data.shift();
    if (busStop === undefined) {
        throw new Error('ターミナルが見つかりません');
    }
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                req.body.id = req.params.id;
                busStop = yield createFromBody(req, false);
                debug('saving an busStop...', busStop);
                yield placeService.updateBusStop(busStop);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign({ additionalProperty: [] }, busStop), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // no op
    }
    else {
        // no op
    }
    res.render('places/busStop/update', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
// tslint:disable-next-line:max-func-body-length
function createFromBody(req, isNew) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line:no-unnecessary-local-variable
        const busStop = Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, id: req.body.id, typeOf: sdk_1.chevre.factory.placeType.BusStop, branchCode: req.body.branchCode, name: req.body.name }, (!isNew)
            ? {
                $unset: {
                // ...(url === undefined) ? { url: 1 } : undefined
                }
            }
            : undefined);
        return busStop;
    });
}
// tslint:disable-next-line:max-func-body-length
function validate() {
    return [
        (0, express_validator_1.body)('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 12 })
            .withMessage('3~12文字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
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
