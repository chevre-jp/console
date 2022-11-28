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
exports.offerCatalogsRouter = void 0;
/**
 * オファーカタログルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const productType_1 = require("../factory/productType");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const products_1 = require("./products");
const validateCsrfToken_1 = require("../middlewares/validateCsrfToken");
const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_NAME_JA = 64;
const DEFAULT_MAX_NUM_OFFER = 100;
// tslint:disable-next-line:no-magic-numbers
const NEW_MAX_NUM_OFFER = (typeof process.env.NEW_MAX_NUM_OFFER === 'string') ? Number(process.env.NEW_MAX_NUM_OFFER) : 100;
const offerCatalogsRouter = (0, express_1.Router)();
exports.offerCatalogsRouter = offerCatalogsRouter;
// tslint:disable-next-line:use-default-type-parameter
offerCatalogsRouter.all('/add', validateCsrfToken_1.validateCsrfToken, ...validate(true), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const chevreProject = yield projectService.findById({ id: req.project.id });
        const useEventServiceAsProduct = ((_a = chevreProject.subscription) === null || _a === void 0 ? void 0 : _a.useEventServiceAsProduct) === true;
        let message = '';
        let errors = {};
        let csrfToken;
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = '';
                    const { offerCatalogFromBody, serviceTypeFromBody } = yield createFromBody(req, useEventServiceAsProduct);
                    const offerCatalog = yield offerCatalogService.create(offerCatalogFromBody);
                    if (!useEventServiceAsProduct) {
                        // EventServiceプロダクトも作成
                        yield upsertEventService(offerCatalog, serviceTypeFromBody)({ product: productService });
                    }
                    // tslint:disable-next-line:no-dynamic-delete
                    delete req.session.csrfSecret;
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/offerCatalogs/${offerCatalog.id}/update`);
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
        const forms = Object.assign(Object.assign({ additionalProperty: [], id: (typeof req.body.id !== 'string' || req.body.id.length === 0) ? '' : req.body.id, name: (req.body.name === undefined || req.body.name === null) ? {} : req.body.name, description: (req.body.description === undefined || req.body.description === null) ? {} : req.body.description, alternateName: (req.body.alternateName === undefined || req.body.alternateName === null) ? {} : req.body.alternateName }, (typeof csrfToken === 'string') ? { csrfToken } : undefined), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        let originalOfferCatalog;
        if (req.method === 'POST') {
            // no op
        }
        else {
            // 既存カタログからの複製の場合
            const duplicateFrom = req.query.duplicateFrom;
            if (typeof duplicateFrom === 'string' && duplicateFrom.length > 0) {
                originalOfferCatalog = yield offerCatalogService.findById({ id: duplicateFrom });
                forms.itemListElement = originalOfferCatalog.itemListElement;
                forms.itemOffered = originalOfferCatalog.itemOffered;
                forms.name = createCopiedString(originalOfferCatalog.name);
            }
        }
        // オファー検索
        let offers = [];
        if (Array.isArray(forms.itemListElement) && forms.itemListElement.length > 0) {
            const itemListElementIds = forms.itemListElement.map((element) => element.id);
            // カタログのアイテムリスト上限数への依存を排除(2022-11-08~)
            const limit = 100;
            let page = 0;
            let numData = limit;
            while (numData === limit) {
                page += 1;
                const searchOffersResult = yield offerService.search({
                    limit,
                    page,
                    project: { id: { $eq: req.project.id } },
                    id: { $in: itemListElementIds }
                });
                numData = searchOffersResult.data.length;
                offers.push(...searchOffersResult.data);
            }
            // 登録順にソート
            offers = offers.sort((a, b) => itemListElementIds.indexOf(a.id) - itemListElementIds.indexOf(b.id));
        }
        const searchServiceTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } }
        });
        res.render('offerCatalogs/add', {
            message: message,
            errors: errors,
            forms: forms,
            serviceTypes: searchServiceTypesResult.data,
            offers: offers,
            productTypes: productType_1.productTypes,
            originalOfferCatalog,
            useEventServiceAsProduct
        });
    }
    catch (error) {
        next(error);
    }
}));
const SUFFIX_COPIED_STRING = ' - コピー';
function createCopiedString(params) {
    return (typeof params === 'string')
        ? `${params}${SUFFIX_COPIED_STRING}`
        : {
            en: (typeof params.en === 'string') ? `${params.en}${SUFFIX_COPIED_STRING}` : '',
            ja: (typeof params.ja === 'string') ? `${params.ja}${SUFFIX_COPIED_STRING}` : ''
        };
}
// tslint:disable-next-line:use-default-type-parameter
offerCatalogsRouter.all('/:id/update', ...validate(false), 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
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
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const searchServiceTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } }
        });
        const chevreProject = yield projectService.findById({ id: req.project.id });
        const useEventServiceAsProduct = ((_b = chevreProject.subscription) === null || _b === void 0 ? void 0 : _b.useEventServiceAsProduct) === true;
        const offerCatalog = yield offerCatalogService.findById({ id: req.params.id });
        let eventServiceProduct;
        if (!useEventServiceAsProduct) {
            const searchEventServicesResult = yield productService.search({
                limit: 1,
                typeOf: { $eq: sdk_1.chevre.factory.product.ProductType.EventService },
                productID: { $eq: `${sdk_1.chevre.factory.product.ProductType.EventService}${offerCatalog.id}` }
            });
            eventServiceProduct = searchEventServicesResult.data.shift();
            if (eventServiceProduct === undefined) {
                throw new Error('興行が見つかりません');
            }
        }
        let message = '';
        let errors = {};
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    // DB登録
                    req.body.id = req.params.id;
                    const { offerCatalogFromBody, serviceTypeFromBody } = yield createFromBody(req, useEventServiceAsProduct);
                    yield offerCatalogService.update(offerCatalogFromBody);
                    if (!useEventServiceAsProduct) {
                        // EventServiceプロダクトも編集(なければ作成)
                        yield upsertEventService(offerCatalogFromBody, serviceTypeFromBody)({ product: productService });
                    }
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign(Object.assign({ additionalProperty: [] }, offerCatalog), { serviceType: (_c = eventServiceProduct === null || eventServiceProduct === void 0 ? void 0 : eventServiceProduct.serviceType) === null || _c === void 0 ? void 0 : _c.codeValue }), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        // オファー検索
        let offers = [];
        if (Array.isArray(forms.itemListElement) && forms.itemListElement.length > 0) {
            const itemListElementIds = forms.itemListElement.map((element) => element.id);
            // カタログのアイテムリスト上限数への依存を排除(2022-11-08~)
            const limit = 100;
            let page = 0;
            let numData = limit;
            while (numData === limit) {
                page += 1;
                const searchOffersResult = yield offerService.search({
                    limit,
                    page,
                    project: { id: { $eq: req.project.id } },
                    id: { $in: itemListElementIds }
                });
                numData = searchOffersResult.data.length;
                offers.push(...searchOffersResult.data);
            }
            // 登録順にソート
            offers = offers.sort((a, b) => itemListElementIds.indexOf(a.id) - itemListElementIds.indexOf(b.id));
        }
        res.render('offerCatalogs/update', {
            message: message,
            errors: errors,
            offers: offers,
            forms: forms,
            serviceTypes: searchServiceTypesResult.data,
            productTypes: productType_1.productTypes,
            useEventServiceAsProduct
        });
    }
    catch (error) {
        next(error);
    }
}));
function upsertEventService(offerCatalog, serviceType) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        // EventServiceでなければ何もしない
        if (offerCatalog.itemOffered.typeOf !== sdk_1.chevre.factory.product.ProductType.EventService) {
            return;
        }
        const eventService = offerCatalog2eventService(offerCatalog, serviceType);
        const searchProductsResult = yield repos.product.search({
            limit: 1,
            typeOf: { $eq: sdk_1.factory.product.ProductType.EventService },
            productID: { $eq: eventService.productID }
        });
        const existingProduct = searchProductsResult.data.shift();
        if (existingProduct === undefined) {
            yield repos.product.create(eventService);
        }
        else {
            yield repos.product.update(Object.assign(Object.assign({}, eventService), { id: existingProduct.id }));
        }
    });
}
offerCatalogsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalog = yield offerCatalogService.findById({ id: req.params.id });
        // 削除して問題ないカタログかどうか検証
        yield preDelete(req, offerCatalog);
        yield offerCatalogService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, offerCatalog) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const chevreProject = yield projectService.findById({ id: req.project.id });
        const useEventServiceAsProduct = ((_a = chevreProject.subscription) === null || _a === void 0 ? void 0 : _a.useEventServiceAsProduct) === true;
        // プロダクト確認
        if (offerCatalog.itemOffered.typeOf === sdk_1.chevre.factory.product.ProductType.EventService) {
            if (!useEventServiceAsProduct) {
                // プロダクトのpreDelete後にEventServiceも削除
                const searchEventServicesResult = yield productService.search({
                    limit: 1,
                    typeOf: { $eq: sdk_1.factory.product.ProductType.EventService },
                    productID: { $eq: `${sdk_1.factory.product.ProductType.EventService}${offerCatalog.id}` }
                });
                const existingEventService = searchEventServicesResult.data.shift();
                if (existingEventService !== undefined) {
                    yield (0, products_1.preDelete)(req, existingEventService);
                    yield productService.deleteById({ id: String(existingEventService.id) });
                }
            }
        }
        const searchProductsResult = yield productService.search({
            limit: 1,
            hasOfferCatalog: { id: { $eq: offerCatalog.id } }
        });
        if (searchProductsResult.data.length > 0) {
            throw new Error('関連するプロダクトが存在します');
        }
        // イベント確認
        const searchEventsResult = yield eventService.search({
            limit: 1,
            typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
            project: { id: { $eq: req.project.id } },
            hasOfferCatalog: { id: { $eq: offerCatalog.id } },
            sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
            endFrom: new Date()
        });
        if (searchEventsResult.data.length > 0) {
            throw new Error('終了していないスケジュールが存在します');
        }
        switch (offerCatalog.itemOffered.typeOf) {
            case productType_1.ProductType.MembershipService:
            case productType_1.ProductType.PaymentCard:
            case productType_1.ProductType.Product:
                break;
            case productType_1.ProductType.EventService:
                break;
            default:
        }
    });
}
offerCatalogsRouter.get('/:id/offers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerCatalog = yield offerCatalogService.findById({ id: req.params.id });
        const offerIds = offerCatalog.itemListElement.map((element) => element.id);
        let offers = [];
        if (offerIds.length > 0) {
            // カタログのアイテムリスト上限数への依存を排除(2022-11-08~)
            const limit = 100;
            let page = 0;
            let numData = limit;
            while (numData === limit) {
                page += 1;
                const searchOffersResult = yield offerService.search({
                    limit,
                    page,
                    project: { id: { $eq: req.project.id } },
                    id: { $in: offerIds }
                });
                numData = searchOffersResult.data.length;
                offers.push(...searchOffersResult.data);
            }
            // 登録順にソート
            offers = offers.sort((a, b) => offerIds.indexOf(a.id) - offerIds.indexOf(b.id));
        }
        res.json({
            success: true,
            count: offers.length,
            results: offers
        });
    }
    catch (err) {
        res.json({
            success: false,
            results: err
        });
    }
}));
offerCatalogsRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    const projectService = new sdk_1.chevre.service.Project({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: '' }
    });
    const chevreProject = yield projectService.findById({ id: req.project.id });
    const useEventServiceAsProduct = ((_d = chevreProject.subscription) === null || _d === void 0 ? void 0 : _d.useEventServiceAsProduct) === true;
    res.render('offerCatalogs/index', {
        message: '',
        productTypes: productType_1.productTypes,
        useEventServiceAsProduct
    });
}));
offerCatalogsRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g, _h, _j, _k;
    try {
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield offerCatalogService.search({
            limit: limit,
            page: page,
            sort: { identifier: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            // 空文字対応(2022-07-12~)
            identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                ? req.query.identifier
                : undefined,
            // 空文字対応(2022-07-11~)
            name: (typeof req.query.name === 'string' && req.query.name.length > 0)
                ? req.query.name
                : undefined,
            itemListElement: {},
            itemOffered: {
                // serviceType: {
                //     codeValue: {
                //         $eq: (typeof req.query.itemOffered?.serviceType?.codeValue?.$eq === 'string'
                //             && req.query.itemOffered.serviceType.codeValue.$eq.length > 0)
                //             ? req.query.itemOffered.serviceType.codeValue.$eq
                //             : undefined
                //     }
                // },
                typeOf: {
                    $eq: (typeof ((_f = (_e = req.query.itemOffered) === null || _e === void 0 ? void 0 : _e.typeOf) === null || _f === void 0 ? void 0 : _f.$eq) === 'string' && ((_h = (_g = req.query.itemOffered) === null || _g === void 0 ? void 0 : _g.typeOf) === null || _h === void 0 ? void 0 : _h.$eq.length) > 0)
                        ? (_k = (_j = req.query.itemOffered) === null || _j === void 0 ? void 0 : _j.typeOf) === null || _k === void 0 ? void 0 : _k.$eq
                        : undefined
                }
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((catalog) => {
                const productType = productType_1.productTypes.find((p) => p.codeValue === catalog.itemOffered.typeOf);
                return Object.assign(Object.assign(Object.assign({}, catalog), (productType !== undefined) ? { itemOfferedName: productType.name } : undefined), { offerCount: (Array.isArray(catalog.itemListElement)) ? catalog.itemListElement.length : 0 });
            })
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
offerCatalogsRouter.get('/searchOffersByPrice', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _l;
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let data;
        const limit = 100;
        const page = 1;
        const searchOffersResult = yield offerService.search({
            limit: limit,
            page: page,
            sort: {
                'priceSpecification.price': sdk_1.chevre.factory.sortType.Descending
            },
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: (_l = req.query.itemOffered) === null || _l === void 0 ? void 0 : _l.typeOf } },
            priceSpecification: {
                // 売上金額で検索
                accounting: {
                    accountsReceivable: {
                        $gte: Number(req.query.price),
                        $lte: Number(req.query.price)
                    }
                }
            }
        });
        data = searchOffersResult.data;
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data
        });
    }
    catch (err) {
        res.json({
            success: false,
            results: err
        });
    }
}));
function createFromBody(req, useEventServiceAsProduct) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let itemListElement = [];
        if (Array.isArray(req.body.itemListElement)) {
            let offerIdsFromBody = req.body.itemListElement.map((element) => String(element.id));
            // 念のため重複排除
            offerIdsFromBody = [...new Set(offerIdsFromBody)];
            itemListElement = offerIdsFromBody.map((offerId) => {
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    id: offerId
                };
            });
        }
        // 興行管理移行済であれば、NEW_MAX_NUM_OFFER
        const maxNumOffer = (useEventServiceAsProduct) ? NEW_MAX_NUM_OFFER : DEFAULT_MAX_NUM_OFFER;
        if (itemListElement.length > maxNumOffer) {
            throw new Error(`オファー数の上限は${maxNumOffer}です`);
        }
        const itemOfferedType = (_a = req.body.itemOffered) === null || _a === void 0 ? void 0 : _a.typeOf;
        let serviceType;
        if (itemOfferedType === sdk_1.chevre.factory.product.ProductType.EventService) {
            if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
                const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                const searchServiceTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
                    codeValue: { $eq: req.body.serviceType }
                });
                serviceType = searchServiceTypesResult.data.shift();
                if (serviceType === undefined) {
                    throw new Error('興行区分が見つかりません');
                }
                serviceType = {
                    project: serviceType.project,
                    id: serviceType.id,
                    typeOf: serviceType.typeOf,
                    codeValue: serviceType.codeValue,
                    inCodeSet: serviceType.inCodeSet
                };
            }
        }
        const offerCatalogFromBody = {
            typeOf: 'OfferCatalog',
            project: { typeOf: req.project.typeOf, id: req.project.id },
            id: req.body.id,
            identifier: req.body.identifier,
            name: req.body.name,
            description: req.body.description,
            alternateName: req.body.alternateName,
            itemListElement: itemListElement,
            itemOffered: {
                typeOf: itemOfferedType
                // 廃止(2022-09-09~)
                // ...(serviceType !== undefined) ? { serviceType } : undefined
            },
            additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined
        };
        return { offerCatalogFromBody, serviceTypeFromBody: serviceType };
    });
}
function offerCatalog2eventService(offerCatalog, serviceType) {
    const eventServiceType = (typeof (serviceType === null || serviceType === void 0 ? void 0 : serviceType.typeOf) === 'string')
        ? {
            codeValue: serviceType.codeValue,
            inCodeSet: serviceType.inCodeSet,
            project: serviceType.project,
            typeOf: serviceType.typeOf
        }
        : undefined;
    if (typeof offerCatalog.id !== 'string' || offerCatalog.id.length === 0) {
        throw new Error('offerCatalog.id undefined');
    }
    return Object.assign({ project: offerCatalog.project, typeOf: sdk_1.factory.product.ProductType.EventService, 
        // productIDフォーマット確定(matches(/^[0-9a-zA-Z]+$/)に注意)(.isLength({ min: 3, max: 30 })に注意)
        productID: `${sdk_1.factory.product.ProductType.EventService}${offerCatalog.id}`, name: offerCatalog.name, hasOfferCatalog: { id: offerCatalog.id, typeOf: offerCatalog.typeOf } }, (typeof (eventServiceType === null || eventServiceType === void 0 ? void 0 : eventServiceType.typeOf) === 'string') ? { serviceType: eventServiceType } : undefined);
}
function validate(isNew) {
    return [
        ...(isNew)
            ? [
                (0, express_validator_1.body)('identifier')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .isLength({ min: 3, max: 30 })
                    .withMessage('3~30文字で入力してください')
                    .matches(/^[0-9a-zA-Z]+$/)
                    .withMessage(() => '英数字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
            ]
            : [
                (0, express_validator_1.body)('identifier')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .isLength({ min: 3, max: 30 })
                    .withMessage('3~30文字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
                // .matches(/^[0-9a-zA-Z\-\+\s]+$/)
                // .withMessage(() => '英数字で入力してください')
            ],
        (0, express_validator_1.body)('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA)),
        (0, express_validator_1.body)('name.en')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '英語名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME_JA)),
        (0, express_validator_1.body)('itemOffered.typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'アイテム')),
        (0, express_validator_1.body)('itemListElement')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'オファーリスト'))
    ];
}
