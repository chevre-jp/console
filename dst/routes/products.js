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
exports.productsRouter = exports.createAvailableChannelFromBody = exports.preDelete = void 0;
/**
 * プロダクトルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const Message = require("../message");
const productType_1 = require("../factory/productType");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
    ? process.env.PROJECT_CREATOR_IDS.split(',')
    : [];
const NUM_ADDITIONAL_PROPERTY = 10;
const productsRouter = (0, express_1.Router)();
exports.productsRouter = productsRouter;
// tslint:disable-next-line:use-default-type-parameter
productsRouter.all('/new', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
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
                // メンバーシップあるいはペイメントカードの場合、createIfNotExistを有効化
                let createIfNotExist = false;
                if (product.typeOf === sdk_1.chevre.factory.product.ProductType.MembershipService
                    || product.typeOf === sdk_1.chevre.factory.product.ProductType.PaymentCard) {
                    createIfNotExist = req.query.createIfNotExist === 'true';
                    // createIfNotExist: falseはPROJECT_CREATOR_IDSにのみ許可
                    if (!PROJECT_CREATOR_IDS.includes(req.user.profile.sub) && !createIfNotExist) {
                        throw new sdk_1.chevre.factory.errors.Forbidden('multiple products forbidden');
                    }
                }
                if (createIfNotExist) {
                    product = (yield productService.createIfNotExist(product));
                }
                else {
                    product = (yield productService.create(product));
                }
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/products/${product.id}`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], award: {}, name: {}, alternateName: {}, description: {}, priceSpecification: {
            referenceQuantity: {
                value: 1
            },
            accounting: {}
        }, itemOffered: { name: {} }, typeOf: req.query.typeOf }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // サービスタイプを保管
        if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
            forms.serviceType = JSON.parse(req.body.serviceType);
        }
        else {
            forms.serviceType = undefined;
        }
        // 通貨区分を保管
        if (typeof req.body.serviceOutputAmount === 'string' && req.body.serviceOutputAmount.length > 0) {
            forms.serviceOutputAmount = JSON.parse(req.body.serviceOutputAmount);
        }
        else {
            forms.serviceOutputAmount = undefined;
        }
    }
    const searchOfferCatalogsResult = yield offerCatalogService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        itemOffered: { typeOf: { $eq: productType_1.ProductType.Product } }
    });
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
    res.render('products/new', {
        message: message,
        errors: errors,
        forms: forms,
        offerCatalogs: searchOfferCatalogsResult.data,
        productTypes: (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0)
            ? productType_1.productTypes.filter((p) => p.codeValue === req.query.typeOf)
            : productType_1.productTypes,
        sellers: searchSellersResult.data
    });
}));
productsRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offersValidFromLte = (typeof ((_b = (_a = req.query.offers) === null || _a === void 0 ? void 0 : _a.$elemMatch) === null || _b === void 0 ? void 0 : _b.validThrough) === 'string'
            && req.query.offers.$elemMatch.validThrough.length > 0)
            ? moment(`${req.query.offers.$elemMatch.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate()
            : undefined;
        const offersValidThroughGte = (typeof ((_d = (_c = req.query.offers) === null || _c === void 0 ? void 0 : _c.$elemMatch) === null || _d === void 0 ? void 0 : _d.validFrom) === 'string'
            && req.query.offers.$elemMatch.validFrom.length > 0)
            ? moment(`${req.query.offers.$elemMatch.validFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate()
            : undefined;
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const searchConditions = {
            limit: limit,
            page: page,
            sort: { productID: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            typeOf: { $eq: (_e = req.query.typeOf) === null || _e === void 0 ? void 0 : _e.$eq },
            hasOfferCatalog: {
                id: {
                    $eq: (typeof ((_f = req.query.hasOfferCatalog) === null || _f === void 0 ? void 0 : _f.id) === 'string' && req.query.hasOfferCatalog.id.length > 0)
                        ? req.query.hasOfferCatalog.id
                        : undefined
                }
            },
            offers: {
                $elemMatch: {
                    validFrom: {
                        $lte: (offersValidFromLte instanceof Date) ? offersValidFromLte : undefined
                    },
                    validThrough: {
                        $gte: (offersValidThroughGte instanceof Date) ? offersValidThroughGte : undefined
                    },
                    'seller.id': {
                        $in: (typeof ((_j = (_h = (_g = req.query.offers) === null || _g === void 0 ? void 0 : _g.$elemMatch) === null || _h === void 0 ? void 0 : _h.seller) === null || _j === void 0 ? void 0 : _j.id) === 'string'
                            && req.query.offers.$elemMatch.seller.id.length > 0)
                            ? [req.query.offers.$elemMatch.seller.id]
                            : undefined
                    }
                }
            },
            name: {
                $regex: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
            },
            serviceType: {
                codeValue: {
                    $eq: (typeof req.query.serviceType === 'string' && req.query.serviceType.length > 0)
                        ? req.query.serviceType
                        : (typeof req.query.paymentMethodType === 'string' && req.query.paymentMethodType.length > 0)
                            ? req.query.paymentMethodType
                            : (typeof req.query.membershipType === 'string' && req.query.membershipType.length > 0)
                                ? req.query.membershipType
                                : undefined
                }
            },
            serviceOutput: {
                amount: {
                    currency: {
                        $eq: (typeof ((_l = (_k = req.query.serviceOutput) === null || _k === void 0 ? void 0 : _k.amount) === null || _l === void 0 ? void 0 : _l.currency) === 'string'
                            && req.query.serviceOutput.amount.currency.length > 0)
                            ? req.query.serviceOutput.amount.currency
                            : undefined
                    }
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
                var _a;
                return Object.assign(Object.assign({}, t), { hasOfferCatalogStr: (typeof ((_a = t.hasOfferCatalog) === null || _a === void 0 ? void 0 : _a.id) === 'string') ? '表示' : '' });
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
productsRouter.all('/:id', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _m, _o, _p, _q;
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
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
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
            try {
                // validation
                yield preDelete(req, product);
                yield productService.deleteById({ id: req.params.id });
                res.status(http_status_1.NO_CONTENT)
                    .end();
            }
            catch (error) {
                res.status(http_status_1.BAD_REQUEST)
                    .json({ error: { message: error.message } });
            }
            return;
        }
        const forms = Object.assign(Object.assign(Object.assign({ award: {} }, product), { offersValidFrom: (Array.isArray(product.offers) && product.offers.length > 0 && product.offers[0].validFrom !== undefined)
                ? moment(product.offers[0].validFrom)
                    // .add(-1, 'day')
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD')
                : '', offersValidThrough: (Array.isArray(product.offers)
                && product.offers.length > 0
                && product.offers[0].validThrough !== undefined)
                ? moment(product.offers[0].validThrough)
                    .add(-1, 'day')
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD')
                : '' }), req.body);
        if (req.method === 'POST') {
            // カタログを保管
            if (typeof req.body.hasOfferCatalog === 'string' && req.body.hasOfferCatalog.length > 0) {
                forms.hasOfferCatalog = JSON.parse(req.body.hasOfferCatalog);
            }
            else {
                forms.hasOfferCatalog = undefined;
            }
            // サービスタイプを保管
            if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
                forms.serviceType = JSON.parse(req.body.serviceType);
            }
            else {
                forms.serviceType = undefined;
            }
            // 通貨区分を保管
            if (typeof req.body.serviceOutputAmount === 'string' && req.body.serviceOutputAmount.length > 0) {
                forms.serviceOutputAmount = JSON.parse(req.body.serviceOutputAmount);
            }
            else {
                forms.serviceOutputAmount = undefined;
            }
        }
        else {
            // カタログを保管
            if (typeof ((_m = product.hasOfferCatalog) === null || _m === void 0 ? void 0 : _m.id) === 'string') {
                const searchHasOfferCatalogsResult = yield offerCatalogService.search({
                    limit: 1,
                    page: 1,
                    itemOffered: { typeOf: { $eq: product.typeOf } },
                    id: { $in: [product.hasOfferCatalog.id] }
                });
                const hasOfferCatalog = searchHasOfferCatalogsResult.data.shift();
                if (hasOfferCatalog !== undefined) {
                    forms.hasOfferCatalog = { id: hasOfferCatalog.id, name: { ja: hasOfferCatalog.name.ja } };
                }
            }
            // サービスタイプを保管
            if (typeof ((_o = product.serviceType) === null || _o === void 0 ? void 0 : _o.codeValue) === 'string') {
                if (product.typeOf === sdk_1.chevre.factory.product.ProductType.EventService) {
                    const searchServiceTypesResult = yield categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
                        codeValue: { $eq: product.serviceType.codeValue }
                    });
                    forms.serviceType = searchServiceTypesResult.data[0];
                }
                else if (product.typeOf === sdk_1.chevre.factory.product.ProductType.MembershipService) {
                    const searchMembershipTypesResult = yield categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } },
                        codeValue: { $eq: product.serviceType.codeValue }
                    });
                    forms.serviceType = searchMembershipTypesResult.data[0];
                }
                else if (product.typeOf === sdk_1.chevre.factory.product.ProductType.PaymentCard) {
                    const searchPaymentMethodTypesResult = yield categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } },
                        codeValue: { $eq: product.serviceType.codeValue }
                    });
                    forms.serviceType = searchPaymentMethodTypesResult.data[0];
                }
            }
            // 通貨区分を保管
            if (typeof ((_q = (_p = product.serviceOutput) === null || _p === void 0 ? void 0 : _p.amount) === null || _q === void 0 ? void 0 : _q.currency) === 'string') {
                if (product.serviceOutput.amount.currency === sdk_1.chevre.factory.priceCurrency.JPY) {
                    forms.serviceOutputAmount = {
                        codeValue: product.serviceOutput.amount.currency,
                        name: { ja: product.serviceOutput.amount.currency }
                    };
                }
                else {
                    const searchCurrencyTypesResult = yield categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                        codeValue: { $eq: product.serviceOutput.amount.currency }
                    });
                    forms.serviceOutputAmount = searchCurrencyTypesResult.data[0];
                }
            }
        }
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
        res.render('products/update', {
            message: message,
            errors: errors,
            forms: forms,
            productTypes: productType_1.productTypes.filter((p) => p.codeValue === product.typeOf),
            sellers: searchSellersResult.data
        });
    }
    catch (err) {
        next(err);
    }
}));
function preDelete(req, product) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOffersResult = yield offerService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            addOn: { itemOffered: { id: { $eq: product.id } } }
        });
        if (searchOffersResult.data.length > 0) {
            throw new Error('関連するオファーが存在します');
        }
        // 関連イベント検証
        const searchEventsResult = yield eventService.search({
            limit: 1,
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
            offers: { itemOffered: { id: { $in: [String(product.id)] } } },
            sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
            endFrom: new Date()
        });
        if (searchEventsResult.data.length > 0) {
            throw new Error('終了していない関連イベントが存在します');
        }
    });
}
exports.preDelete = preDelete;
productsRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // すでにtypeOfのプロダクトがあるかどうか
    let productsExist = false;
    if (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0) {
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchProductsResult = yield productService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            typeOf: { $eq: req.query.typeOf }
        });
        productsExist = searchProductsResult.data.length > 0;
    }
    let showCreateIfNotExistButton = true;
    // メンバーシップあるいはペイメントカードの場合、プロダクト既存であれば登録ボタンを表示しない
    if (req.query.typeOf === sdk_1.chevre.factory.product.ProductType.MembershipService
        || req.query.typeOf === sdk_1.chevre.factory.product.ProductType.PaymentCard) {
        if (productsExist) {
            showCreateIfNotExistButton = false;
        }
    }
    res.render('products/index', {
        message: '',
        productTypes: (typeof req.query.typeOf === 'string')
            ? productType_1.productTypes.filter((p) => p.codeValue === req.query.typeOf)
            : productType_1.productTypes,
        showCreateIfNotExistButton
    });
}));
function createAvailableChannelFromBody(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const serviceUrl = (_a = req.body.availableChannel) === null || _a === void 0 ? void 0 : _a.serviceUrl;
    const siteId = (_c = (_b = req.body.availableChannel) === null || _b === void 0 ? void 0 : _b.credentials) === null || _c === void 0 ? void 0 : _c.siteId;
    const sitePass = (_e = (_d = req.body.availableChannel) === null || _d === void 0 ? void 0 : _d.credentials) === null || _e === void 0 ? void 0 : _e.sitePass;
    const authorizeServerDomain = (_g = (_f = req.body.availableChannel) === null || _f === void 0 ? void 0 : _f.credentials) === null || _g === void 0 ? void 0 : _g.authorizeServerDomain;
    const clientId = (_j = (_h = req.body.availableChannel) === null || _h === void 0 ? void 0 : _h.credentials) === null || _j === void 0 ? void 0 : _j.clientId;
    const clientSecret = (_l = (_k = req.body.availableChannel) === null || _k === void 0 ? void 0 : _k.credentials) === null || _l === void 0 ? void 0 : _l.clientSecret;
    const availableChannelCredentials = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof siteId === 'string' && siteId.length > 0) ? { siteId } : undefined), (typeof sitePass === 'string' && sitePass.length > 0) ? { sitePass } : undefined), (typeof authorizeServerDomain === 'string' && authorizeServerDomain.length > 0) ? { authorizeServerDomain } : undefined), (typeof clientId === 'string' && clientId.length > 0) ? { clientId } : undefined), (typeof clientSecret === 'string' && clientSecret.length > 0) ? { clientSecret } : undefined);
    const informPaymentUrl = (_q = (_p = (_o = (_m = req.body.availableChannel) === null || _m === void 0 ? void 0 : _m.onPaymentStatusChanged) === null || _o === void 0 ? void 0 : _o.informPayment) === null || _p === void 0 ? void 0 : _p.recipient) === null || _q === void 0 ? void 0 : _q.url;
    let onPaymentStatusChanged;
    if (typeof informPaymentUrl === 'string' && informPaymentUrl.length > 0) {
        onPaymentStatusChanged = {
            informPayment: [
                { recipient: { url: informPaymentUrl } }
            ]
        };
    }
    return Object.assign(Object.assign({ typeOf: 'ServiceChannel', credentials: availableChannelCredentials }, (typeof serviceUrl === 'string' && serviceUrl.length > 0) ? { serviceUrl } : undefined), (onPaymentStatusChanged !== undefined) ? { onPaymentStatusChanged } : undefined);
}
exports.createAvailableChannelFromBody = createAvailableChannelFromBody;
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a, _b, _c;
    const availableChannel = createAvailableChannelFromBody(req);
    let hasOfferCatalog;
    if (typeof req.body.hasOfferCatalog === 'string' && req.body.hasOfferCatalog.length > 0) {
        try {
            const hasOfferCatalogByBody = JSON.parse(req.body.hasOfferCatalog);
            if (typeof hasOfferCatalogByBody.id !== 'string' || hasOfferCatalogByBody.id.length === 0) {
                throw new Error('hasOfferCatalogByBody.id undefined');
            }
            hasOfferCatalog = {
                typeOf: 'OfferCatalog',
                id: hasOfferCatalogByBody.id
            };
        }
        catch (error) {
            throw new Error(`invalid serviceOutput ${error.message}`);
        }
    }
    let serviceOutput;
    if (typeof req.body.serviceOutputStr === 'string' && req.body.serviceOutputStr.length > 0) {
        try {
            serviceOutput = JSON.parse(req.body.serviceOutputStr);
        }
        catch (error) {
            throw new Error(`invalid serviceOutput ${error.message}`);
        }
    }
    switch (req.body.typeOf) {
        case sdk_1.chevre.factory.product.ProductType.MembershipService:
            if (serviceOutput === undefined) {
                serviceOutput = {
                    // project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.permit.PermitType.Permit // メンバーシップの場合固定
                };
            }
            else {
                serviceOutput.typeOf = sdk_1.chevre.factory.permit.PermitType.Permit; // メンバーシップの場合固定
            }
            break;
        case sdk_1.chevre.factory.product.ProductType.PaymentCard:
            if (serviceOutput === undefined) {
                serviceOutput = {
                    // project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.permit.PermitType.Permit // ペイメントカードの場合固定
                };
            }
            else {
                serviceOutput.typeOf = sdk_1.chevre.factory.permit.PermitType.Permit; // ペイメントカードの場合固定
            }
            if (typeof req.body.serviceOutputAmount === 'string' && req.body.serviceOutputAmount.length > 0) {
                let serviceOutputAmount;
                try {
                    serviceOutputAmount = JSON.parse(req.body.serviceOutputAmount);
                }
                catch (error) {
                    throw new Error(`invalid serviceOutputAmount ${error.message}`);
                }
                serviceOutput.amount = { currency: serviceOutputAmount.codeValue, typeOf: 'MonetaryAmount' };
            }
            break;
        default:
            serviceOutput = undefined;
    }
    let serviceType;
    if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
        try {
            serviceType = JSON.parse(req.body.serviceType);
            serviceType = {
                codeValue: serviceType.codeValue,
                inCodeSet: serviceType.inCodeSet,
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: 'CategoryCode'
            };
        }
        catch (error) {
            throw new Error(`invalid serviceOutput ${error.message}`);
        }
    }
    let offers;
    let sellerIds = (_b = (_a = req.body.offers) === null || _a === void 0 ? void 0 : _a.seller) === null || _b === void 0 ? void 0 : _b.id;
    if (typeof sellerIds === 'string' && sellerIds.length > 0) {
        sellerIds = [sellerIds];
    }
    if (Array.isArray(sellerIds)) {
        if (typeof req.body.offersValidFrom === 'string'
            && req.body.offersValidFrom.length > 0
            && typeof req.body.offersValidThrough === 'string'
            && req.body.offersValidThrough.length > 0) {
            const validFrom = moment(`${req.body.offersValidFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate();
            const validThrough = moment(`${req.body.offersValidThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .add(1, 'day')
                .toDate();
            offers = sellerIds.map((sellerId) => {
                return {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY,
                    availabilityEnds: validThrough,
                    availabilityStarts: validFrom,
                    validFrom: validFrom,
                    validThrough: validThrough,
                    seller: {
                        id: sellerId
                    }
                };
            });
        }
    }
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: req.body.typeOf, id: req.params.id, productID: req.body.productID, description: req.body.description, name: req.body.name, availableChannel }, (typeof ((_c = req.body.award) === null || _c === void 0 ? void 0 : _c.ja) === 'string') ? { award: req.body.award } : undefined), (hasOfferCatalog !== undefined) ? { hasOfferCatalog } : undefined), (offers !== undefined) ? { offers } : undefined), (serviceOutput !== undefined) ? { serviceOutput } : undefined), (serviceType !== undefined) ? { serviceType } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign(Object.assign(Object.assign({}, (hasOfferCatalog === undefined) ? { hasOfferCatalog: 1 } : undefined), (offers === undefined) ? { offers: 1 } : undefined), (serviceOutput === undefined) ? { serviceOutput: 1 } : undefined), (serviceType === undefined) ? { serviceType: 1 } : undefined)
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
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 30 })
            .withMessage('3~30文字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
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
        (0, express_validator_1.body)('award.ja')
            .optional()
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 1024 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('特典', 1024)),
        (0, express_validator_1.body)('award.en')
            .optional()
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語特典', 1024)),
        // EventServiceの場合はカタログ必須
        (0, express_validator_1.body)('hasOfferCatalog')
            .if((_, { req }) => [
            sdk_1.chevre.factory.product.ProductType.EventService
        ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'カタログ')),
        (0, express_validator_1.body)('serviceType')
            .if((_, { req }) => [
            sdk_1.chevre.factory.product.ProductType.MembershipService
        ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーシップ区分')),
        (0, express_validator_1.body)('serviceType')
            .if((_, { req }) => [
            sdk_1.chevre.factory.product.ProductType.PaymentCard
        ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法区分')),
        (0, express_validator_1.body)('serviceOutputAmount')
            .if((_, { req }) => [
            sdk_1.chevre.factory.product.ProductType.PaymentCard
        ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '通貨区分'))
    ];
}
