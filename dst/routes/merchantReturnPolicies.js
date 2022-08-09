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
exports.merchantReturnPoliciesRouter = void 0;
/**
 * 返品ポリシールーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const returnFeesEnumerationMovieTicketTypes_1 = require("../factory/returnFeesEnumerationMovieTicketTypes");
const returnFeesEnumerationTypes_1 = require("../factory/returnFeesEnumerationTypes");
const NUM_ADDITIONAL_PROPERTY = 10;
const merchantReturnPoliciesRouter = express_1.Router();
exports.merchantReturnPoliciesRouter = merchantReturnPoliciesRouter;
merchantReturnPoliciesRouter.get('', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('merchantReturnPolicies/index', {
        message: ''
    });
}));
merchantReturnPoliciesRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const merchantReturnPolicyService = new sdk_1.chevre.service.MerchantReturnPolicy({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield merchantReturnPolicyService.search({
            limit: limit,
            page: page,
            sort: { identifier: sdk_1.chevre.factory.sortType.Ascending },
            identifier: {
                $regex: (typeof ((_a = req.query.identifier) === null || _a === void 0 ? void 0 : _a.$regex) === 'string' && req.query.identifier.$regex.length > 0)
                    ? req.query.identifier.$regex
                    : undefined
            },
            name: {
                $regex: (typeof ((_b = req.query.name) === null || _b === void 0 ? void 0 : _b.$regex) === 'string' && req.query.name.$regex.length > 0)
                    ? req.query.name.$regex
                    : undefined
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((returnPolicy) => {
                var _a, _b;
                const customerRemorseReturnFeesStr = (_a = returnFeesEnumerationTypes_1.returnFeesEnumerationTypes
                    .find((r) => r.codeValue === returnPolicy.customerRemorseReturnFees)) === null || _a === void 0 ? void 0 : _a.name;
                const customerRemorseReturnFeesMovieTicketStr = (_b = returnFeesEnumerationMovieTicketTypes_1.returnFeesEnumerationMovieTicketTypes
                    .find((r) => r.codeValue === returnPolicy.customerRemorseReturnFeesMovieTicket)) === null || _b === void 0 ? void 0 : _b.name;
                return Object.assign(Object.assign({}, returnPolicy), { customerRemorseReturnFeesStr,
                    customerRemorseReturnFeesMovieTicketStr });
            })
        });
    }
    catch (error) {
        res.json({
            success: false,
            message: error.message,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
merchantReturnPoliciesRouter.all('/new', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const merchantReturnPolicyService = new sdk_1.chevre.service.MerchantReturnPolicy({
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
                let returnPolicy = createReturnPolicyFromBody(req, true);
                // コード重複確認
                const searchPoliciesResult = yield merchantReturnPolicyService.search({
                    identifier: { $eq: returnPolicy.identifier }
                });
                if (searchPoliciesResult.data.length > 0) {
                    throw new Error('既に存在するコードです');
                }
                returnPolicy = yield merchantReturnPolicyService.create(returnPolicy);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/merchantReturnPolicies/${returnPolicy.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], appliesToCategoryCode: {} }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // no op
    }
    res.render('merchantReturnPolicies/new', {
        message: message,
        errors: errors,
        forms: forms,
        returnFeesEnumerationMovieTicketTypes: returnFeesEnumerationMovieTicketTypes_1.returnFeesEnumerationMovieTicketTypes,
        returnFeesEnumerationTypes: returnFeesEnumerationTypes_1.returnFeesEnumerationTypes
    });
}));
// tslint:disable-next-line:use-default-type-parameter
merchantReturnPoliciesRouter.all('/:id/update', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const merchantReturnPolicyService = new sdk_1.chevre.service.MerchantReturnPolicy({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    let returnPolicy = yield merchantReturnPolicyService.findById({
        id: req.params.id
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            // コンテンツDB登録
            try {
                returnPolicy = Object.assign(Object.assign({}, createReturnPolicyFromBody(req, false)), { id: String(returnPolicy.id) });
                yield merchantReturnPolicyService.update(returnPolicy);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign({ additionalProperty: [] }, returnPolicy), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // no op
    }
    res.render('merchantReturnPolicies/update', {
        message: message,
        errors: errors,
        forms: forms,
        returnFeesEnumerationMovieTicketTypes: returnFeesEnumerationMovieTicketTypes_1.returnFeesEnumerationMovieTicketTypes,
        returnFeesEnumerationTypes: returnFeesEnumerationTypes_1.returnFeesEnumerationTypes
    });
}));
merchantReturnPoliciesRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const merchantReturnPolicyService = new sdk_1.chevre.service.MerchantReturnPolicy({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const returnPolicy = yield merchantReturnPolicyService.findById({ id: req.params.id });
        yield preDelete(req, returnPolicy);
        yield merchantReturnPolicyService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
merchantReturnPoliciesRouter.get('/howApplicated', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('merchantReturnPolicies/howApplicated', {});
}));
function preDelete(req, returnPolicy) {
    return __awaiter(this, void 0, void 0, function* () {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOffersResult = yield offerService.search({
            limit: 1,
            hasMerchantReturnPolicy: { id: { $eq: String(returnPolicy.id) } }
        });
        if (searchOffersResult.data.length > 0) {
            throw new Error('関連するオファーが存在します');
        }
    });
}
function createReturnPolicyFromBody(req, isNew) {
    var _a;
    const nameEn = (_a = req.body.name) === null || _a === void 0 ? void 0 : _a.en;
    return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: 'MerchantReturnPolicy', identifier: req.body.identifier, customerRemorseReturnFees: String(req.body.customerRemorseReturnFees), customerRemorseReturnFeesMovieTicket: String(req.body.customerRemorseReturnFeesMovieTicket), additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined, name: Object.assign({ ja: req.body.name.ja }, (typeof nameEn === 'string' && nameEn.length > 0) ? { en: nameEn } : undefined) }, (!isNew)
        ? {
        // $unset: {
        //     ...(typeof image !== 'string') ? { image: 1 } : undefined,
        //     ...(typeof color !== 'string') ? { color: 1 } : undefined
        // }
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ max: 20 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 20))
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        express_validator_1.body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),
        express_validator_1.body('name.en')
            .optional()
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語名称', 30)),
        express_validator_1.body('customerRemorseReturnFees')
            .not()
            .isEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '返品手数料タイプ'))
            .isIn([
            sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn,
            sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.RestockingFees,
            sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility
        ])
            .withMessage('不適切な値です'),
        express_validator_1.body('customerRemorseReturnFeesMovieTicket')
            .not()
            .isEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済カード着券取消タイプ'))
            .isIn([
            sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn,
            sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility
        ])
            .withMessage('不適切な値です')
    ];
}
