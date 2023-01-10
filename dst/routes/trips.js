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
exports.tripsRouter = void 0;
/**
 * トリップルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const Message = require("../message");
const validateCsrfToken_1 = require("..//middlewares/validateCsrfToken");
const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_NAME = 64;
const tripsRouter = (0, express_1.Router)();
exports.tripsRouter = tripsRouter;
// tslint:disable-next-line:use-default-type-parameter
tripsRouter.all('/add', validateCsrfToken_1.validateCsrfToken, ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const tripService = new sdk_1.chevre.service.Trip({
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
                const attributesList = [
                    createFromBody(req, true)
                ];
                const trips = yield tripService.create(attributesList);
                // tslint:disable-next-line:no-dynamic-delete
                delete req.session.csrfSecret;
                req.flash('message', `${trips.length}つのトリップを登録しました`);
                const redirect = `/projects/${req.project.id}/trips/${trips[0].id}/update`;
                res.redirect(redirect);
                return;
            }
            catch (error) {
                console.error(error);
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
    const forms = Object.assign(Object.assign({ additionalProperty: [] }, (typeof csrfToken === 'string') ? { csrfToken } : undefined), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // no op
    }
    res.render('trips/add', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
tripsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('trips/index', {});
}));
tripsRouter.get('/getlist', 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const tripService = new sdk_1.chevre.service.Trip({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const additionalPropertyElemMatchNameEq = (_c = (_b = (_a = req.query.additionalProperty) === null || _a === void 0 ? void 0 : _a.$elemMatch) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.$eq;
        const { data } = yield tripService.search({
            limit: limit,
            page: page,
            sort: {
                identifier: (req.query.sortType === String(sdk_1.chevre.factory.sortType.Descending))
                    ? sdk_1.chevre.factory.sortType.Descending
                    : sdk_1.chevre.factory.sortType.Ascending
            },
            project: { id: { $eq: req.project.id } },
            identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                ? { $eq: req.query.identifier }
                : undefined,
            name: (typeof req.query.name === 'string' && req.query.name.length > 0)
                ? { $regex: req.query.name }
                : undefined,
            typeOf: sdk_1.chevre.factory.tripType.BusTrip,
            additionalProperty: Object.assign({}, (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
                : undefined)
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((trip) => {
                // const additionalPropertyMatched =
                //     (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                //         ? event.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                //         : undefined;
                return Object.assign({}, trip
                // ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
                );
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
// tslint:disable-next-line:use-default-type-parameter
tripsRouter.all('/:tripId/update', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tripService = new sdk_1.chevre.service.Trip({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let message = '';
        let errors = {};
        const tripId = req.params.tripId;
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    const attributes = createFromBody(req, false);
                    yield tripService.update({
                        id: tripId,
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
        const trip = yield tripService.findById({ id: tripId });
        const forms = Object.assign(Object.assign({ additionalProperty: [] }, trip), req.body);
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
        res.render('trips/edit', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (error) {
        next(error);
    }
}));
tripsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tripService = new sdk_1.chevre.service.Trip({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // validation
        const trip = yield tripService.findById({ id: req.params.id });
        yield preDelete(req, trip);
        yield tripService.deleteById({ id: req.params.id });
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
        // validation
        // const tripService = new chevre.service.Trip({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient,
        //     project: { id: req.project.id }
        // });
        // const searchEventsResult = await tripService.search<chevre.factory.eventType.ScreeningEvent>({
        //     limit: 1,
        //     project: { id: { $eq: req.project.id } },
        //     typeOf: chevre.factory.eventType.ScreeningEvent,
        //     superEvent: { ids: [eventSeries.id] }
        // });
        // if (searchEventsResult.data.length > 0) {
        //     throw new Error('関連するスケジュールが存在します');
        // }
    });
}
tripsRouter.get('/:tripId/events', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            data: [],
            // 使用する側ではスケジュールが存在するかどうかが知れれば十分
            totalCount: 0
        });
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({ error: { message: error.message } });
    }
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a, _b;
    return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.tripType.BusTrip, name: Object.assign({ ja: (_a = req.body.name) === null || _a === void 0 ? void 0 : _a.ja }, (typeof ((_b = req.body.name) === null || _b === void 0 ? void 0 : _b.en) === 'string' && req.body.name.en.length > 0) ? { en: req.body.name.en } : undefined), arrivalBusStop: {
            typeOf: sdk_1.chevre.factory.placeType.BusStop,
            name: { ja: 'SampleArrivalBusStop' },
            branchCode: '001'
        }, departureBusStop: {
            typeOf: sdk_1.chevre.factory.placeType.BusStop,
            name: { ja: 'SampleDepartureBusStop' },
            branchCode: '001'
        }, identifier: String(req.body.identifier) }, (!isNew)
        ? {
        // $unset: {
        // }
        }
        : undefined);
}
function validate() {
    return [
        (0, express_validator_1.body)('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 32 })
            .withMessage('3~32文字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        (0, express_validator_1.body)('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        (0, express_validator_1.body)('name.en')
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME))
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
