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
 * 決済サービスルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const paymentServiceType_1 = require("../factory/paymentServiceType");
const NUM_ADDITIONAL_PROPERTY = 10;
const NUM_PROVIDER = 20;
const paymentServicesRouter = express_1.Router();
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
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        // 検証
        if (validatorResult.isEmpty()) {
            try {
                let product = createFromBody(req, true);
                // プロダクトID重複確認
                const searchProductsResult = yield productService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    productID: { $eq: product.productID }
                });
                if (searchProductsResult.data.length > 0) {
                    throw new Error('既に存在するプロダクトIDです');
                }
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
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
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
            const validatorResult = express_validator_1.validationResult(req);
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
        const forms = Object.assign(Object.assign({ provider: [] }, product), req.body);
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
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    let availableChannel;
    // if (typeof req.body.availableChannelStr === 'string' && req.body.availableChannelStr.length > 0) {
    //     try {
    //         availableChannel = JSON.parse(req.body.availableChannelStr);
    //     } catch (error) {
    //         throw new Error(`invalid offers ${error.message}`);
    //     }
    // }
    const serviceUrl = (_a = req.body.availableChannel) === null || _a === void 0 ? void 0 : _a.serviceUrl;
    const siteId = (_c = (_b = req.body.availableChannel) === null || _b === void 0 ? void 0 : _b.credentials) === null || _c === void 0 ? void 0 : _c.siteId;
    const sitePass = (_e = (_d = req.body.availableChannel) === null || _d === void 0 ? void 0 : _d.credentials) === null || _e === void 0 ? void 0 : _e.sitePass;
    const authorizeServerDomain = (_g = (_f = req.body.availableChannel) === null || _f === void 0 ? void 0 : _f.credentials) === null || _g === void 0 ? void 0 : _g.authorizeServerDomain;
    const clientId = (_j = (_h = req.body.availableChannel) === null || _h === void 0 ? void 0 : _h.credentials) === null || _j === void 0 ? void 0 : _j.clientId;
    const clientSecret = (_l = (_k = req.body.availableChannel) === null || _k === void 0 ? void 0 : _k.credentials) === null || _l === void 0 ? void 0 : _l.clientSecret;
    const availableChannelCredentials = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof siteId === 'string' && siteId.length > 0) ? { siteId } : undefined), (typeof sitePass === 'string' && sitePass.length > 0) ? { sitePass } : undefined), (typeof authorizeServerDomain === 'string' && authorizeServerDomain.length > 0) ? { authorizeServerDomain } : undefined), (typeof clientId === 'string' && clientId.length > 0) ? { clientId } : undefined), (typeof clientSecret === 'string' && clientSecret.length > 0) ? { clientSecret } : undefined);
    availableChannel = Object.assign({ typeOf: 'ServiceChannel', credentials: availableChannelCredentials }, (typeof serviceUrl === 'string' && serviceUrl.length > 0) ? { serviceUrl } : undefined);
    let serviceOutput;
    // if (typeof req.body.serviceOutputStr === 'string' && req.body.serviceOutputStr.length > 0) {
    //     try {
    //         serviceOutput = JSON.parse(req.body.serviceOutputStr);
    //     } catch (error) {
    //         throw new Error(`invalid serviceOutput ${error.message}`);
    //     }
    // }
    if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
        try {
            const paymentMethodTypeCategoryCode = JSON.parse(req.body.paymentMethodType);
            serviceOutput = {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: paymentMethodTypeCategoryCode.codeValue
            };
        }
        catch (error) {
            throw new Error(`invalid paymentMethodType ${error.message}`);
        }
    }
    let serviceType;
    if (serviceOutput !== undefined) {
        serviceType = {
            codeValue: serviceOutput.typeOf,
            inCodeSet: { typeOf: 'CategoryCodeSet', identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType },
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: 'CategoryCode'
        };
    }
    let provider = [];
    if (Array.isArray(req.body.provider)) {
        provider = req.body.provider.filter((p) => typeof p.seller === 'string' && p.seller.length > 0)
            .map((p) => {
            var _a, _b, _c, _d, _e, _f;
            const selectedSeller = JSON.parse(p.seller);
            const credentials = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof ((_a = p.credentials) === null || _a === void 0 ? void 0 : _a.shopId) === 'string' && p.credentials.shopId.length > 0)
                ? { shopId: p.credentials.shopId }
                : undefined), (typeof ((_b = p.credentials) === null || _b === void 0 ? void 0 : _b.shopPass) === 'string' && p.credentials.shopPass.length > 0)
                ? { shopPass: p.credentials.shopPass }
                : undefined), (typeof ((_c = p.credentials) === null || _c === void 0 ? void 0 : _c.tokenizationCode) === 'string' && p.credentials.tokenizationCode.length > 0)
                ? { tokenizationCode: p.credentials.tokenizationCode }
                : undefined), (typeof ((_d = p.credentials) === null || _d === void 0 ? void 0 : _d.paymentUrl) === 'string' && p.credentials.paymentUrl.length > 0)
                ? { paymentUrl: p.credentials.paymentUrl }
                : undefined), (typeof ((_e = p.credentials) === null || _e === void 0 ? void 0 : _e.kgygishCd) === 'string' && p.credentials.kgygishCd.length > 0)
                ? { kgygishCd: p.credentials.kgygishCd }
                : undefined), (typeof ((_f = p.credentials) === null || _f === void 0 ? void 0 : _f.stCd) === 'string' && p.credentials.stCd.length > 0)
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
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: req.body.typeOf, id: req.params.id, productID: req.body.productID }, {
        name: req.body.name
    }), { provider }), (availableChannel !== undefined) ? { availableChannel } : undefined), (serviceType !== undefined) ? { serviceType } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign(Object.assign({}, (availableChannel === undefined) ? { availableChannel: 1 } : undefined), { serviceOutput: 1 }), (serviceType === undefined) ? { serviceType: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'プロダクトタイプ')),
        express_validator_1.body('productID')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'プロダクトID'))
            .matches(/^[0-9a-zA-Z]+$/)
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('プロダクトID', 30)),
        express_validator_1.body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),
        express_validator_1.body('paymentMethodType')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法区分'))
    ];
}
exports.default = paymentServicesRouter;
