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
exports.searchApplications = exports.SMART_THEATER_CLIENT_NEW = exports.SMART_THEATER_CLIENT_OLD = void 0;
/**
 * 単価オファー管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const Message = require("../message");
// import { itemAvailabilities } from '../factory/itemAvailability';
const productType_1 = require("../factory/productType");
const ticketType_1 = require("./ticketType");
exports.SMART_THEATER_CLIENT_OLD = process.env.SMART_THEATER_CLIENT_OLD;
exports.SMART_THEATER_CLIENT_NEW = process.env.SMART_THEATER_CLIENT_NEW;
const NUM_ADDITIONAL_PROPERTY = 10;
// コード 半角64
const NAME_MAX_LENGTH_CODE = 30;
// 名称・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// 金額
const CHAGE_MAX_LENGTH = 10;
const offersRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
offersRouter.all('/add', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let message = '';
    let errors = {};
    const itemOfferedTypeOf = (_a = req.query.itemOffered) === null || _a === void 0 ? void 0 : _a.typeOf;
    if (itemOfferedTypeOf === productType_1.ProductType.EventService) {
        res.redirect(`/projects/${req.project.id}/ticketTypes/add`);
        return;
    }
    const offerService = new sdk_1.chevre.service.Offer({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const accountTitleService = new sdk_1.chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
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
            // 登録プロセス
            try {
                req.body.id = '';
                let offer = yield ticketType_1.createFromBody(req, true);
                // コード重複確認
                const searchOffersResult = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    identifier: { $eq: offer.identifier }
                });
                if (searchOffersResult.data.length > 0) {
                    throw new Error('既に存在するコードです');
                }
                offer = yield offerService.create(offer);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/offers/${offer.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], name: {}, alternateName: {}, description: {}, priceSpecification: {
            referenceQuantity: {
                value: 1
            },
            accounting: {}
        }, itemOffered: { typeOf: itemOfferedTypeOf } }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    // カテゴリーを検索
    if (req.method === 'POST') {
        // カテゴリーを保管
        if (typeof req.body.category === 'string' && req.body.category.length > 0) {
            forms.category = JSON.parse(req.body.category);
        }
        else {
            forms.category = undefined;
        }
        // 細目を保管
        if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
            forms.accounting = JSON.parse(req.body.accounting);
        }
        else {
            forms.accounting = undefined;
        }
        // 利用可能アプリケーションを保管
        const availableAtOrFromParams = (_b = req.body.availableAtOrFrom) === null || _b === void 0 ? void 0 : _b.id;
        if (Array.isArray(availableAtOrFromParams)) {
            forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                return { id: applicationId };
            });
        }
        else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
            forms.availableAtOrFrom = { id: availableAtOrFromParams };
        }
        // ポイント特典を保管
        if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0) {
            forms.pointAwardCurrecy = JSON.parse(req.body.pointAwardCurrecy);
        }
        else {
            forms.pointAwardCurrecy = undefined;
        }
    }
    const searchOfferCategoryTypesResult = yield categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
    });
    const searchAccountTitlesResult = yield accountTitleService.search({
        project: { id: { $eq: req.project.id } }
    });
    const applications = yield searchApplications(req);
    res.render('offers/add', {
        message: message,
        errors: errors,
        forms: forms,
        ticketTypeCategories: searchOfferCategoryTypesResult.data,
        accountTitles: searchAccountTitlesResult.data,
        productTypes: productType_1.productTypes,
        applications: applications.map((d) => d.member)
            .sort((a, b) => {
            if (String(a.name) < String(b.name)) {
                return -1;
            }
            if (String(a.name) > String(b.name)) {
                return 1;
            }
            return 0;
        })
    });
}));
// tslint:disable-next-line:use-default-type-parameter
offersRouter.all('/:id/update', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    let message = '';
    let errors = {};
    const itemOfferedTypeOf = (_c = req.query.itemOffered) === null || _c === void 0 ? void 0 : _c.typeOf;
    if (itemOfferedTypeOf === productType_1.ProductType.EventService) {
        res.redirect(`/projects/${req.project.id}/ticketTypes/${req.params.id}/update`);
        return;
    }
    const offerService = new sdk_1.chevre.service.Offer({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const accountTitleService = new sdk_1.chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        let offer = yield offerService.findById({ id: req.params.id });
        if (((_d = offer.itemOffered) === null || _d === void 0 ? void 0 : _d.typeOf) === productType_1.ProductType.EventService) {
            res.redirect(`/projects/${req.project.id}/ticketTypes/${req.params.id}/update`);
            return;
        }
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    offer = yield ticketType_1.createFromBody(req, false);
                    yield offerService.update(offer);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const accountsReceivable = (typeof ((_f = (_e = offer.priceSpecification) === null || _e === void 0 ? void 0 : _e.accounting) === null || _f === void 0 ? void 0 : _f.accountsReceivable) === 'number')
            ? String(offer.priceSpecification.accounting.accountsReceivable)
            : '';
        const forms = Object.assign(Object.assign(Object.assign({}, offer), { accountsReceivable, validFrom: (offer.validFrom !== undefined)
                ? moment(offer.validFrom)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD')
                : '', validThrough: (offer.validThrough !== undefined)
                ? moment(offer.validThrough)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD')
                : '' }), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // カテゴリーを保管
            if (typeof req.body.category === 'string' && req.body.category.length > 0) {
                forms.category = JSON.parse(req.body.category);
            }
            else {
                forms.category = undefined;
            }
            // 細目を保管
            if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
                forms.accounting = JSON.parse(req.body.accounting);
            }
            else {
                forms.accounting = undefined;
            }
            // 利用可能アプリケーションを保管
            const availableAtOrFromParams = (_g = req.body.availableAtOrFrom) === null || _g === void 0 ? void 0 : _g.id;
            if (Array.isArray(availableAtOrFromParams)) {
                forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                    return { id: applicationId };
                });
            }
            else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
                forms.availableAtOrFrom = { id: availableAtOrFromParams };
            }
            // ポイント特典を保管
            if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0) {
                forms.pointAwardCurrecy = JSON.parse(req.body.pointAwardCurrecy);
            }
            else {
                forms.pointAwardCurrecy = undefined;
            }
        }
        else {
            // カテゴリーを検索
            if (typeof ((_h = offer.category) === null || _h === void 0 ? void 0 : _h.codeValue) === 'string') {
                const searchOfferCategoriesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
                    codeValue: { $eq: offer.category.codeValue }
                });
                forms.category = searchOfferCategoriesResult.data[0];
            }
            // 細目を検索
            if (typeof ((_l = (_k = (_j = offer.priceSpecification) === null || _j === void 0 ? void 0 : _j.accounting) === null || _k === void 0 ? void 0 : _k.operatingRevenue) === null || _l === void 0 ? void 0 : _l.codeValue) === 'string') {
                const searchAccountTitlesResult = yield accountTitleService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    codeValue: { $eq: (_m = offer.priceSpecification.accounting.operatingRevenue) === null || _m === void 0 ? void 0 : _m.codeValue }
                });
                forms.accounting = searchAccountTitlesResult.data[0];
            }
            // ポイント特典を検索
            if (typeof ((_q = (_p = (_o = offer.itemOffered) === null || _o === void 0 ? void 0 : _o.pointAward) === null || _p === void 0 ? void 0 : _p.amount) === null || _q === void 0 ? void 0 : _q.currency) === 'string') {
                const searchEligibleCurrencyTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                    codeValue: { $eq: offer.itemOffered.pointAward.amount.currency }
                });
                forms.pointAwardCurrecy = searchEligibleCurrencyTypesResult.data[0];
                forms.pointAwardValue = offer.itemOffered.pointAward.amount.value;
            }
            else {
                forms.pointAwardCurrecy = undefined;
                forms.pointAwardValue = undefined;
            }
        }
        const searchOfferCategoryTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
        });
        const applications = yield searchApplications(req);
        res.render('offers/update', {
            message: message,
            errors: errors,
            forms: forms,
            ticketTypeCategories: searchOfferCategoryTypesResult.data,
            productTypes: productType_1.productTypes,
            applications: applications.map((d) => d.member)
                .sort((a, b) => {
                if (String(a.name) < String(b.name)) {
                    return -1;
                }
                if (String(a.name) > String(b.name)) {
                    return 1;
                }
                return 0;
            })
        });
    }
    catch (error) {
        next(error);
    }
}));
offersRouter.get('/:id/catalogs', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = 100;
        const page = 1;
        const { data } = yield offerCatalogService.search({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            itemListElement: {
                id: { $in: [req.params.id] }
            }
        });
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
            message: err.message,
            count: 0,
            results: []
        });
    }
}));
offersRouter.get('/:id/availableApplications', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let data = [];
        const offer = yield offerService.findById({ id: req.params.id });
        if (Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom.length > 0) {
            const searchApplicationsResult = yield iamService.searchMembers({
                member: {
                    typeOf: { $eq: sdk_1.chevre.factory.creativeWorkType.WebApplication },
                    id: { $in: offer.availableAtOrFrom.map((a) => a.id) }
                }
            });
            data = searchApplicationsResult.data.map((m) => m.member);
        }
        res.json({
            success: true,
            count: data.length,
            results: data
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
/**
 * オファー検索
 */
offersRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('offers/index', {
        message: '',
        productTypes: productType_1.productTypes
    });
}));
offersRouter.get('/getlist', 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // const categoryCodeService = new chevre.service.CategoryCode({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient,
        //     project: { id: req.project.id }
        // });
        // const searchOfferCategoryTypesResult = await categoryCodeService.search({
        //     limit: 100,
        //     project: { id: { $eq: req.project.id } },
        //     inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
        // });
        // const offerCategoryTypes = searchOfferCategoryTypesResult.data;
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const identifierRegex = req.query.identifier;
        const searchConditions = {
            limit: limit,
            page: page,
            sort: { 'priceSpecification.price': sdk_1.chevre.factory.sortType.Ascending },
            availableAtOrFrom: {
                id: {
                    $eq: (typeof req.query.application === 'string' && req.query.application.length > 0)
                        ? req.query.application
                        : undefined
                }
            },
            project: { id: { $eq: req.project.id } },
            eligibleMembershipType: {
                codeValue: {
                    $eq: (typeof req.query.eligibleMembershipType === 'string' && req.query.eligibleMembershipType.length > 0)
                        ? req.query.eligibleMembershipType
                        : undefined
                }
            },
            eligibleMonetaryAmount: {
                currency: {
                    $eq: (typeof ((_r = req.query.eligibleMonetaryAmount) === null || _r === void 0 ? void 0 : _r.currency) === 'string'
                        && req.query.eligibleMonetaryAmount.currency.length > 0)
                        ? req.query.eligibleMonetaryAmount.currency
                        : undefined
                }
            },
            eligibleSeatingType: {
                codeValue: {
                    $eq: (typeof req.query.eligibleSeatingType === 'string' && req.query.eligibleSeatingType.length > 0)
                        ? req.query.eligibleSeatingType
                        : undefined
                }
            },
            hasMerchantReturnPolicy: {
                id: {
                    $eq: (typeof ((_t = (_s = req.query.hasMerchantReturnPolicy) === null || _s === void 0 ? void 0 : _s.id) === null || _t === void 0 ? void 0 : _t.$eq) === 'string'
                        && req.query.hasMerchantReturnPolicy.id.$eq.length > 0)
                        ? req.query.hasMerchantReturnPolicy.id.$eq
                        : undefined
                }
            },
            itemOffered: {
                typeOf: {
                    $eq: (typeof ((_u = req.query.itemOffered) === null || _u === void 0 ? void 0 : _u.typeOf) === 'string' && ((_v = req.query.itemOffered) === null || _v === void 0 ? void 0 : _v.typeOf.length) > 0)
                        ? (_w = req.query.itemOffered) === null || _w === void 0 ? void 0 : _w.typeOf : undefined
                }
            },
            identifier: {
                $regex: (typeof identifierRegex === 'string' && identifierRegex.length > 0) ? identifierRegex : undefined
            },
            id: (typeof req.query.id === 'string' && req.query.id.length > 0) ? { $eq: req.query.id } : undefined,
            name: (req.query.name !== undefined
                && req.query.name !== '')
                ? { $regex: req.query.name }
                : undefined,
            priceSpecification: {
                accounting: {
                    operatingRevenue: {
                        codeValue: {
                            $eq: (typeof ((_x = req.query.accountTitle) === null || _x === void 0 ? void 0 : _x.codeValue) === 'string' && req.query.accountTitle.codeValue.length > 0)
                                ? String(req.query.accountTitle.codeValue)
                                : undefined
                        }
                    }
                },
                appliesToMovieTicket: {
                    serviceType: {
                        $eq: (typeof req.query.appliesToMovieTicket === 'string'
                            && req.query.appliesToMovieTicket.length > 0)
                            ? JSON.parse(req.query.appliesToMovieTicket).codeValue
                            : undefined
                    },
                    serviceOutput: {
                        typeOf: {
                            $eq: (typeof req.query.appliesToMovieTicket === 'string'
                                && req.query.appliesToMovieTicket.length > 0)
                                ? (_y = JSON.parse(req.query.appliesToMovieTicket).paymentMethod) === null || _y === void 0 ? void 0 : _y.typeOf
                                : undefined
                        }
                    }
                },
                price: {
                    $gte: (req.query.priceSpecification !== undefined
                        && req.query.priceSpecification.minPrice !== undefined
                        && req.query.priceSpecification.minPrice !== '')
                        ? Number(req.query.priceSpecification.minPrice)
                        : undefined,
                    $lte: (req.query.priceSpecification !== undefined
                        && req.query.priceSpecification.maxPrice !== undefined
                        && req.query.priceSpecification.maxPrice !== '')
                        ? Number(req.query.priceSpecification.maxPrice)
                        : undefined
                },
                referenceQuantity: {
                    value: {
                        $eq: (req.query.priceSpecification !== undefined
                            && req.query.priceSpecification.referenceQuantity !== undefined
                            && req.query.priceSpecification.referenceQuantity.value !== undefined
                            && req.query.priceSpecification.referenceQuantity.value !== '')
                            ? Number(req.query.priceSpecification.referenceQuantity.value)
                            : undefined
                    }
                }
            },
            category: {
                codeValue: (req.query.category !== undefined
                    && typeof req.query.category.codeValue === 'string'
                    && req.query.category.codeValue !== '')
                    ? { $in: [req.query.category.codeValue] }
                    : undefined
            },
            addOn: {
                itemOffered: {
                    id: {
                        $eq: (typeof ((_0 = (_z = req.query.addOn) === null || _z === void 0 ? void 0 : _z.itemOffered) === null || _0 === void 0 ? void 0 : _0.id) === 'string' && req.query.addOn.itemOffered.id.length > 0)
                            ? req.query.addOn.itemOffered.id
                            : undefined
                    }
                }
            }
        };
        let data;
        const searchResult = yield offerService.search(searchConditions);
        data = searchResult.data;
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            // tslint:disable-next-line:cyclomatic-complexity
            results: data.map((t) => {
                // const categoryCode = t.category?.codeValue;
                var _a, _b, _c, _d, _e, _f;
                const productType = productType_1.productTypes.find((p) => { var _a; return p.codeValue === ((_a = t.itemOffered) === null || _a === void 0 ? void 0 : _a.typeOf); });
                // const itemAvailability = itemAvailabilities.find((i) => i.codeValue === t.availability);
                const referenceQuantityUnitCode = (_a = t.priceSpecification) === null || _a === void 0 ? void 0 : _a.referenceQuantity.unitCode;
                let priceUnitStr = String(referenceQuantityUnitCode);
                switch (referenceQuantityUnitCode) {
                    case sdk_1.chevre.factory.unitCode.C62:
                        if (((_b = req.query.itemOffered) === null || _b === void 0 ? void 0 : _b.typeOf) === productType_1.ProductType.EventService) {
                            priceUnitStr = '枚';
                        }
                        else {
                            priceUnitStr = '点';
                        }
                        break;
                    case sdk_1.chevre.factory.unitCode.Ann:
                        priceUnitStr = '年';
                        break;
                    case sdk_1.chevre.factory.unitCode.Day:
                        priceUnitStr = '日';
                        break;
                    case sdk_1.chevre.factory.unitCode.Sec:
                        priceUnitStr = '秒';
                        break;
                    default:
                }
                const priceCurrencyStr = (((_c = t.priceSpecification) === null || _c === void 0 ? void 0 : _c.priceCurrency) === sdk_1.chevre.factory.priceCurrency.JPY)
                    ? '円'
                    : (_d = t.priceSpecification) === null || _d === void 0 ? void 0 : _d.priceCurrency;
                const priceStr = `${(_e = t.priceSpecification) === null || _e === void 0 ? void 0 : _e.price}${priceCurrencyStr} / ${(_f = t.priceSpecification) === null || _f === void 0 ? void 0 : _f.referenceQuantity.value}${priceUnitStr}`;
                return Object.assign(Object.assign({}, t), { itemOfferedName: productType === null || productType === void 0 ? void 0 : productType.name, availableAtOrFromCount: (Array.isArray(t.availableAtOrFrom))
                        ? t.availableAtOrFrom.length
                        : 0, 
                    // categoryName: (typeof categoryCode === 'string')
                    //     ? (<chevre.factory.multilingualString>offerCategoryTypes.find((c) => c.codeValue === categoryCode)?.name)?.ja
                    //     : '',
                    addOnCount: (Array.isArray(t.addOn))
                        ? t.addOn.length
                        : 0, priceStr, validFromStr: (t.validFrom !== undefined || t.validThrough !== undefined) ? '有' : '', returnPolicyCount: (Array.isArray(t.hasMerchantReturnPolicy))
                        ? t.hasMerchantReturnPolicy.length
                        : 0 });
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
offersRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // validation
        const offer = yield offerService.findById({ id: req.params.id });
        yield preDelete(req, offer);
        yield offerService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
const AVAILABLE_ROLE_NAMES = ['customer', 'pos'];
function searchApplications(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchApplicationsResult = yield iamService.searchMembers({
            member: { typeOf: { $eq: sdk_1.chevre.factory.creativeWorkType.WebApplication } }
        });
        let applications = searchApplicationsResult.data;
        // 新旧クライアントが両方存在すれば、新クライアントを隠す
        const memberIds = applications.map((a) => a.member.id);
        if (typeof exports.SMART_THEATER_CLIENT_OLD === 'string' && exports.SMART_THEATER_CLIENT_OLD.length > 0
            && typeof exports.SMART_THEATER_CLIENT_NEW === 'string' && exports.SMART_THEATER_CLIENT_NEW.length > 0) {
            const oldClientExists = memberIds.includes(exports.SMART_THEATER_CLIENT_OLD);
            const newClientExists = memberIds.includes(exports.SMART_THEATER_CLIENT_NEW);
            if (oldClientExists && newClientExists) {
                applications = applications.filter((a) => a.member.id !== exports.SMART_THEATER_CLIENT_NEW);
            }
        }
        // ロールで絞る(customer or pos)
        applications = applications
            .filter((m) => {
            return Array.isArray(m.member.hasRole) && m.member.hasRole.some((r) => AVAILABLE_ROLE_NAMES.includes(r.roleName));
        });
        return applications;
    });
}
exports.searchApplications = searchApplications;
function preDelete(req, offer) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchCatalogsResult = yield offerCatalogService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            itemListElement: {
                id: { $in: [String(offer.id)] }
            }
        });
        if (searchCatalogsResult.data.length > 0) {
            throw new Error('関連するオファーカタログが存在します');
        }
    });
}
function validate() {
    return [
        express_validator_1.body('identifier', Message.Common.required.replace('$fieldName$', 'コード'))
            .notEmpty()
            .isLength({ min: 3, max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', 30))
            .matches(/^[0-9a-zA-Z\-_]+$/)
            .withMessage(() => '英数字で入力してください'),
        express_validator_1.body('itemOffered.typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'アイテム')),
        express_validator_1.body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE)),
        express_validator_1.body('alternateName.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '代替名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('代替名称', NAME_MAX_LENGTH_NAME_JA)),
        express_validator_1.body('priceSpecification.referenceQuantity.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用数')),
        express_validator_1.oneOf([
            [
                express_validator_1.body('priceSpecification.referenceQuantity.value')
                    .isIn([sdk_1.chevre.factory.quantitativeValue.StringValue.Infinity])
                    .withMessage(() => '正の値を入力してください')
            ],
            [
                express_validator_1.body('priceSpecification.referenceQuantity.value')
                    .isInt()
                    .custom((value) => Number(value) >= 0)
                    .withMessage(() => '正の値を入力してください')
            ]
        ]),
        express_validator_1.body('priceSpecification.referenceQuantity.unitCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用単位')),
        express_validator_1.body('priceSpecification.price')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '発生金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(Message.Common.getMaxLengthHalfByte('発生金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        express_validator_1.body('accountsReceivable')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '売上金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLengthHalfByte('売上金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')
    ];
}
exports.default = offersRouter;
