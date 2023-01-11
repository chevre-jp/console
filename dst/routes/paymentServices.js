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
exports.paymentServicesRouter = void 0;
/**
 * 決済サービスルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const paymentServiceType_1 = require("../factory/paymentServiceType");
const products_1 = require("./products");
const NUM_ADDITIONAL_PROPERTY = 10;
const NUM_PROVIDER = 20;
const paymentServicesRouter = (0, express_1.Router)();
exports.paymentServicesRouter = paymentServicesRouter;
// tslint:disable-next-line:use-default-type-parameter
paymentServicesRouter.all('/new', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // 検証
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        // 検証
        if (validatorResult.isEmpty()) {
            try {
                let product = createFromBody(req, true);
                product = (yield productService.create(product));
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/paymentServices/${product.id}`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ provider: [], additionalProperty: [], name: {}, alternateName: {}, description: {}, priceSpecification: {
            referenceQuantity: {
                value: 1
            },
            accounting: {}
        }, itemOffered: { name: {} } }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (forms.provider.length < NUM_PROVIDER) {
        // tslint:disable-next-line:prefer-array-literal
        forms.provider.push(...[...Array(NUM_PROVIDER - forms.provider.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // プロバイダーを保管
        if (Array.isArray(forms.provider)) {
            forms.provider.forEach((provider, key) => {
                if (typeof provider.seller === 'string' && provider.seller.length > 0) {
                    forms.provider[key] = Object.assign(Object.assign({}, JSON.parse(provider.seller)), provider);
                }
                else {
                    forms.provider[key] = {};
                }
            });
        }
        // 決済方法区分を保管
        if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
            forms.paymentMethodType = JSON.parse(req.body.paymentMethodType);
        }
        else {
            forms.paymentMethodType = undefined;
        }
    }
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
    res.render('paymentServices/new', {
        message: message,
        errors: errors,
        forms: forms,
        paymentServiceTypes: paymentServiceType_1.paymentServiceTypes,
        sellers: searchSellersResult.data
    });
}));
paymentServicesRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const searchConditions = {
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            typeOf: (typeof ((_a = req.query.typeOf) === null || _a === void 0 ? void 0 : _a.$eq) === 'string' && req.query.typeOf.$eq.length > 0)
                ? { $eq: req.query.typeOf.$eq }
                : {
                    $in: [
                        sdk_1.chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                        sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                    ]
                },
            serviceType: {
                codeValue: {
                    $eq: (typeof req.query.paymentMethodType === 'string' && req.query.paymentMethodType.length > 0)
                        ? req.query.paymentMethodType
                        : undefined
                }
            }
        };
        const { data } = yield productService.search(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((t) => {
                return Object.assign({}, t);
            })
        });
    }
    catch (err) {
        res.json({
            success: false,
            message: err.message,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
paymentServicesRouter.all('/:id', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        let message = '';
        let errors = {};
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let product = yield productService.findById({ id: req.params.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    product = createFromBody(req, false);
                    yield productService.update(product);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        else if (req.method === 'DELETE') {
            yield productService.deleteById({ id: req.params.id });
            res.status(http_status_1.NO_CONTENT)
                .end();
            return;
        }
        const forms = Object.assign(Object.assign({ additionalProperty: [], provider: [] }, product), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.provider.length < NUM_PROVIDER) {
            // tslint:disable-next-line:prefer-array-literal
            forms.provider.push(...[...Array(NUM_PROVIDER - forms.provider.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // プロバイダーを保管
            if (Array.isArray(forms.provider)) {
                forms.provider.forEach((provider, key) => {
                    if (typeof provider.seller === 'string' && provider.seller.length > 0) {
                        forms.provider[key] = Object.assign(Object.assign({}, JSON.parse(provider.seller)), provider);
                    }
                    else {
                        forms.provider[key] = {};
                    }
                });
            }
            // 決済方法区分を保管
            if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
                forms.paymentMethodType = JSON.parse(req.body.paymentMethodType);
            }
            else {
                forms.paymentMethodType = undefined;
            }
        }
        else {
            // 決済方法区分を保管
            if (typeof ((_b = product.serviceType) === null || _b === void 0 ? void 0 : _b.codeValue) === 'string') {
                const searchPaymentMethodTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } },
                    codeValue: { $eq: product.serviceType.codeValue }
                });
                forms.paymentMethodType = searchPaymentMethodTypesResult.data[0];
            }
        }
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
        res.render('paymentServices/update', {
            message: message,
            errors: errors,
            forms: forms,
            paymentServiceTypes: paymentServiceType_1.paymentServiceTypes,
            sellers: searchSellersResult.data
        });
    }
    catch (err) {
        next(err);
    }
}));
paymentServicesRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
    res.render('paymentServices/index', {
        message: '',
        paymentServiceTypes: paymentServiceType_1.paymentServiceTypes,
        sellers: searchSellersResult.data
    });
}));
// tslint:disable-next-line:max-func-body-length
function createFromBody(req, isNew) {
    const availableChannel = (0, products_1.createAvailableChannelFromBody)(req);
    let serviceTypeCodeValue;
    if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
        try {
            const paymentMethodTypeCategoryCode = JSON.parse(req.body.paymentMethodType);
            serviceTypeCodeValue = paymentMethodTypeCategoryCode.codeValue;
        }
        catch (error) {
            throw new Error(`invalid paymentMethodType ${error.message}`);
        }
    }
    let serviceType;
    if (serviceTypeCodeValue !== undefined) {
        serviceType = {
            codeValue: serviceTypeCodeValue,
            inCodeSet: { typeOf: 'CategoryCodeSet', identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType },
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: 'CategoryCode'
        };
    }
    let provider = [];
    if (Array.isArray(req.body.provider)) {
        provider = req.body.provider.filter((p) => typeof p.seller === 'string' && p.seller.length > 0)
            .map((p) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const selectedSeller = JSON.parse(p.seller);
            const useCallback = ((_b = (_a = p.credentials) === null || _a === void 0 ? void 0 : _a.paymentUrl) === null || _b === void 0 ? void 0 : _b.useCallback) === '1';
            const useWebhook = ((_d = (_c = p.credentials) === null || _c === void 0 ? void 0 : _c.paymentUrl) === null || _d === void 0 ? void 0 : _d.useWebhook) === '1';
            const paymentUrlSettings = (typeof ((_f = (_e = p.credentials) === null || _e === void 0 ? void 0 : _e.paymentUrl) === null || _f === void 0 ? void 0 : _f.expiresInSeconds) === 'string'
                && p.credentials.paymentUrl.expiresInSeconds.length > 0)
                ? {
                    expiresInSeconds: Number(p.credentials.paymentUrl.expiresInSeconds),
                    useCallback,
                    useWebhook
                }
                : undefined;
            const credentials = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof ((_g = p.credentials) === null || _g === void 0 ? void 0 : _g.shopId) === 'string' && p.credentials.shopId.length > 0)
                ? { shopId: p.credentials.shopId }
                : undefined), (typeof ((_h = p.credentials) === null || _h === void 0 ? void 0 : _h.shopPass) === 'string' && p.credentials.shopPass.length > 0)
                ? { shopPass: p.credentials.shopPass }
                : undefined), (typeof ((_j = p.credentials) === null || _j === void 0 ? void 0 : _j.tokenizationCode) === 'string' && p.credentials.tokenizationCode.length > 0)
                ? { tokenizationCode: p.credentials.tokenizationCode }
                : undefined), (typeof (paymentUrlSettings === null || paymentUrlSettings === void 0 ? void 0 : paymentUrlSettings.expiresInSeconds) === 'number')
                ? {
                    paymentUrl: paymentUrlSettings,
                    paymentUrlExpiresInSeconds: paymentUrlSettings.expiresInSeconds // 互換性維持対応として(2023-01-12~)
                }
                : undefined), (typeof ((_k = p.credentials) === null || _k === void 0 ? void 0 : _k.kgygishCd) === 'string' && p.credentials.kgygishCd.length > 0)
                ? { kgygishCd: p.credentials.kgygishCd }
                : undefined), (typeof ((_l = p.credentials) === null || _l === void 0 ? void 0 : _l.stCd) === 'string' && p.credentials.stCd.length > 0)
                ? { stCd: p.credentials.stCd }
                : undefined);
            return {
                typeOf: selectedSeller.typeOf,
                id: String(selectedSeller.id),
                name: selectedSeller.name,
                credentials
            };
        });
    }
    return Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: req.body.typeOf, id: req.params.id, productID: req.body.productID, description: req.body.description, name: req.body.name, provider, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined, availableChannel }, (serviceType !== undefined) ? { serviceType } : undefined), (!isNew)
        ? {
            $unset: Object.assign({ serviceOutput: 1 }, (serviceType === undefined) ? { serviceType: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        (0, express_validator_1.body)('typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'プロダクトタイプ')),
        (0, express_validator_1.body)('productID')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'プロダクトID'))
            .matches(/^[0-9a-zA-Z]+$/)
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('プロダクトID', 30)),
        (0, express_validator_1.body)('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),
        (0, express_validator_1.body)('name.en')
            .optional()
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語名称', 30)),
        (0, express_validator_1.body)('paymentMethodType')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法区分'))
    ];
}
