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
 * 単価オファー管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const Message = require("../message");
const productType_1 = require("../factory/productType");
const offers_1 = require("./offers");
const NUM_ADDITIONAL_PROPERTY = 10;
// 券種コード 半角64
const NAME_MAX_LENGTH_CODE = 30;
// 券種名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// 券種名・英語 半角128
const NAME_MAX_LENGTH_NAME_EN = 64;
// 金額
const CHAGE_MAX_LENGTH = 10;
const ticketTypeMasterRouter = express_1.Router();
// 券種登録
ticketTypeMasterRouter.all('/add', ...validateFormAdd(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    let message = '';
    let errors = {};
    const offerService = new sdk_1.chevre.service.Offer({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
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
            // DB登録プロセス
            try {
                req.body.id = '';
                let ticketType = yield createFromBody(req, true);
                // コード重複確認
                const { data } = yield offerService.search({
                    project: { id: { $eq: req.project.id } },
                    identifier: { $eq: ticketType.identifier }
                });
                if (data.length > 0) {
                    throw new Error('既に存在するコードです');
                }
                ticketType = yield offerService.create(ticketType);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/ticketTypes/${ticketType.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], name: {}, alternateName: {}, description: {}, itemOffered: { typeOf: productType_1.ProductType.EventService }, priceSpecification: {
            referenceQuantity: {
                value: 1
            },
            accounting: {}
        }, 
        // isBoxTicket: (_.isEmpty(req.body.isBoxTicket)) ? '' : req.body.isBoxTicket,
        // isOnlineTicket: (_.isEmpty(req.body.isOnlineTicket)) ? '' : req.body.isOnlineTicket,
        seatReservationUnit: (typeof req.body.seatReservationUnit !== 'string' || req.body.seatReservationUnit.length === 0)
            ? 1
            : req.body.seatReservationUnit }, req.body);
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
        const availableAtOrFromParams = (_a = req.body.availableAtOrFrom) === null || _a === void 0 ? void 0 : _a.id;
        if (Array.isArray(availableAtOrFromParams)) {
            forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                return { id: applicationId };
            });
        }
        else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
            forms.availableAtOrFrom = { id: availableAtOrFromParams };
        }
        // アドオンを保管
        let addOnItemOfferedIds = (_c = (_b = req.body.addOn) === null || _b === void 0 ? void 0 : _b.itemOffered) === null || _c === void 0 ? void 0 : _c.id;
        if (typeof addOnItemOfferedIds === 'string') {
            addOnItemOfferedIds = [addOnItemOfferedIds];
        }
        if (Array.isArray(addOnItemOfferedIds)) {
            forms.addOn = addOnItemOfferedIds.map((addOnItemOfferedId) => {
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    itemOffered: {
                        id: addOnItemOfferedId
                    }
                };
            });
        }
        // 適用決済カードを保管
        if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
            forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
        }
        else {
            forms.appliesToMovieTicket = undefined;
        }
        // 適用通貨区分を保管
        if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0) {
            forms.eligibleMonetaryAmount = JSON.parse(req.body.eligibleMonetaryAmount);
        }
        else {
            forms.eligibleMonetaryAmount = undefined;
        }
        // 適用座席区分を保管
        if (typeof req.body.eligibleSeatingType === 'string' && req.body.eligibleSeatingType.length > 0) {
            forms.eligibleSeatingType = JSON.parse(req.body.eligibleSeatingType);
        }
        else {
            forms.eligibleSeatingType = undefined;
        }
        // 適用メンバーシップ区分を保管
        if (typeof req.body.eligibleMembershipType === 'string' && req.body.eligibleMembershipType.length > 0) {
            forms.eligibleMembershipType = JSON.parse(req.body.eligibleMembershipType);
        }
        else {
            forms.eligibleMembershipType = undefined;
        }
        // 適用サブ予約を保管
        if (typeof req.body.eligibleSubReservation === 'string' && req.body.eligibleSubReservation.length > 0) {
            forms.eligibleSubReservation = JSON.parse(req.body.eligibleSubReservation);
        }
        else {
            forms.eligibleSubReservation = undefined;
        }
    }
    const searchAddOnsResult = yield productService.search(Object.assign({ project: { id: { $eq: req.project.id } }, typeOf: { $eq: productType_1.ProductType.Product } }, {
        limit: 100
    }));
    const applications = yield offers_1.searchApplications(req);
    res.render('ticketType/add', {
        message: message,
        errors: errors,
        forms: forms,
        addOns: searchAddOnsResult.data,
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
// 券種編集
// tslint:disable-next-line:use-default-type-parameter
ticketTypeMasterRouter.all('/:id/update', ...validateFormAdd(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
    let message = '';
    let errors = {};
    const offerService = new sdk_1.chevre.service.Offer({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const accountTitleService = new sdk_1.chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        let ticketType = yield offerService.findById({ id: req.params.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                // 券種DB更新プロセス
                try {
                    req.body.id = req.params.id;
                    ticketType = yield createFromBody(req, false);
                    yield offerService.update(ticketType);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        if (ticketType.priceSpecification === undefined) {
            throw new Error('ticketType.priceSpecification undefined');
        }
        let seatReservationUnit = 1;
        if (ticketType.priceSpecification.referenceQuantity.value !== undefined) {
            seatReservationUnit = ticketType.priceSpecification.referenceQuantity.value;
        }
        const accountsReceivable = (ticketType.priceSpecification.accounting !== undefined)
            ? ticketType.priceSpecification.accounting.accountsReceivable
            : '';
        const forms = Object.assign(Object.assign(Object.assign(Object.assign({ additionalProperty: [], alternateName: {}, priceSpecification: {
                referenceQuantity: {}
            } }, ticketType), { 
            // category: (ticketType.category !== undefined) ? ticketType.category.codeValue : '',
            price: Math.floor(Number(ticketType.priceSpecification.price) / seatReservationUnit), accountsReceivable: Math.floor(Number(accountsReceivable) / seatReservationUnit), validFrom: (ticketType.validFrom !== undefined)
                ? moment(ticketType.validFrom)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD')
                : '', validThrough: (ticketType.validThrough !== undefined)
                ? moment(ticketType.validThrough)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD')
                : '' }), req.body), { seatReservationUnit: (typeof req.body.seatReservationUnit !== 'string' || req.body.seatReservationUnit.length === 0)
                ? seatReservationUnit
                : req.body.seatReservationUnit, accountTitle: (typeof req.body.accountTitle !== 'string' || req.body.accountTitle.length === 0)
                ? (_f = (_e = (_d = ticketType.priceSpecification) === null || _d === void 0 ? void 0 : _d.accounting) === null || _e === void 0 ? void 0 : _e.operatingRevenue) === null || _f === void 0 ? void 0 : _f.codeValue : req.body.accountTitle });
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
            // アドオンを保管
            let addOnItemOfferedIds = (_j = (_h = req.body.addOn) === null || _h === void 0 ? void 0 : _h.itemOffered) === null || _j === void 0 ? void 0 : _j.id;
            if (typeof addOnItemOfferedIds === 'string') {
                addOnItemOfferedIds = [addOnItemOfferedIds];
            }
            if (Array.isArray(addOnItemOfferedIds)) {
                forms.addOn = addOnItemOfferedIds.map((addOnItemOfferedId) => {
                    return {
                        typeOf: sdk_1.chevre.factory.offerType.Offer,
                        itemOffered: {
                            id: addOnItemOfferedId
                        }
                    };
                });
            }
            // 適用決済カードを保管
            if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
            }
            else {
                forms.appliesToMovieTicket = undefined;
            }
            // 適用通貨区分を保管
            if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0) {
                forms.eligibleMonetaryAmount = JSON.parse(req.body.eligibleMonetaryAmount);
            }
            else {
                forms.eligibleMonetaryAmount = undefined;
            }
            // 適用座席区分を保管
            if (typeof req.body.eligibleSeatingType === 'string' && req.body.eligibleSeatingType.length > 0) {
                forms.eligibleSeatingType = JSON.parse(req.body.eligibleSeatingType);
            }
            else {
                forms.eligibleSeatingType = undefined;
            }
            // 適用メンバーシップ区分を保管
            if (typeof req.body.eligibleMembershipType === 'string' && req.body.eligibleMembershipType.length > 0) {
                forms.eligibleMembershipType = JSON.parse(req.body.eligibleMembershipType);
            }
            else {
                forms.eligibleMembershipType = undefined;
            }
            // 適用サブ予約を保管
            if (typeof req.body.eligibleSubReservation === 'string' && req.body.eligibleSubReservation.length > 0) {
                forms.eligibleSubReservation = JSON.parse(req.body.eligibleSubReservation);
            }
            else {
                forms.eligibleSubReservation = undefined;
            }
        }
        else {
            // カテゴリーを検索
            if (typeof ((_k = ticketType.category) === null || _k === void 0 ? void 0 : _k.codeValue) === 'string') {
                const searchOfferCategoriesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
                    codeValue: { $eq: ticketType.category.codeValue }
                });
                forms.category = searchOfferCategoriesResult.data[0];
            }
            // 細目を検索
            if (typeof ((_o = (_m = (_l = ticketType.priceSpecification) === null || _l === void 0 ? void 0 : _l.accounting) === null || _m === void 0 ? void 0 : _m.operatingRevenue) === null || _o === void 0 ? void 0 : _o.codeValue) === 'string') {
                const searchAccountTitlesResult = yield accountTitleService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    codeValue: { $eq: (_p = ticketType.priceSpecification.accounting.operatingRevenue) === null || _p === void 0 ? void 0 : _p.codeValue }
                });
                forms.accounting = searchAccountTitlesResult.data[0];
            }
            // 適用決済カードを検索
            if (typeof ((_r = (_q = ticketType.priceSpecification) === null || _q === void 0 ? void 0 : _q.appliesToMovieTicket) === null || _r === void 0 ? void 0 : _r.serviceType) === 'string') {
                const searchAppliesToMovieTicketsResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } },
                    codeValue: { $eq: (_t = (_s = ticketType.priceSpecification) === null || _s === void 0 ? void 0 : _s.appliesToMovieTicket) === null || _t === void 0 ? void 0 : _t.serviceType }
                });
                forms.appliesToMovieTicket = searchAppliesToMovieTicketsResult.data[0];
            }
            // 適用通貨区分を検索
            if (Array.isArray(ticketType.eligibleMonetaryAmount)
                && typeof ((_u = ticketType.eligibleMonetaryAmount[0]) === null || _u === void 0 ? void 0 : _u.currency) === 'string') {
                const searchEligibleCurrencyTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                    codeValue: { $eq: (_v = ticketType.eligibleMonetaryAmount[0]) === null || _v === void 0 ? void 0 : _v.currency }
                });
                forms.eligibleMonetaryAmount = searchEligibleCurrencyTypesResult.data[0];
                forms.eligibleMonetaryAmountValue = (_w = ticketType.eligibleMonetaryAmount[0]) === null || _w === void 0 ? void 0 : _w.value;
            }
            else {
                forms.eligibleMonetaryAmount = undefined;
                forms.eligibleMonetaryAmountValue = undefined;
            }
            // 適用座席区分を検索
            if (Array.isArray(ticketType.eligibleSeatingType)
                && typeof ((_x = ticketType.eligibleSeatingType[0]) === null || _x === void 0 ? void 0 : _x.codeValue) === 'string') {
                const searcheEligibleSeatingTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } },
                    codeValue: { $eq: (_y = ticketType.eligibleSeatingType[0]) === null || _y === void 0 ? void 0 : _y.codeValue }
                });
                forms.eligibleSeatingType = searcheEligibleSeatingTypesResult.data[0];
            }
            else {
                forms.eligibleSeatingType = undefined;
            }
            // 適用メンバーシップ区分を検索
            if (Array.isArray(ticketType.eligibleMembershipType)
                && typeof ((_z = ticketType.eligibleMembershipType[0]) === null || _z === void 0 ? void 0 : _z.codeValue) === 'string') {
                const searcheEligibleMembershipTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } },
                    codeValue: { $eq: (_0 = ticketType.eligibleMembershipType[0]) === null || _0 === void 0 ? void 0 : _0.codeValue }
                });
                forms.eligibleMembershipType = searcheEligibleMembershipTypesResult.data[0];
            }
            else {
                forms.eligibleMembershipType = undefined;
            }
            // 適用サブ予約を検索
            if (Array.isArray(ticketType.eligibleSubReservation)
                && typeof ((_2 = (_1 = ticketType.eligibleSubReservation[0]) === null || _1 === void 0 ? void 0 : _1.typeOfGood) === null || _2 === void 0 ? void 0 : _2.seatingType) === 'string') {
                const searcheEligibleSubReservationSeatingTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } },
                    codeValue: { $eq: ticketType.eligibleSubReservation[0].typeOfGood.seatingType }
                });
                forms.eligibleSubReservation = searcheEligibleSubReservationSeatingTypesResult.data[0];
                forms.eligibleSubReservationAmount = ticketType.eligibleSubReservation[0].amountOfThisGood;
            }
            else {
                forms.eligibleSubReservation = undefined;
                forms.eligibleSubReservationAmount = undefined;
            }
        }
        const searchAddOnsResult = yield productService.search(Object.assign({ project: { id: { $eq: req.project.id } }, typeOf: { $eq: productType_1.ProductType.Product } }, {
            limit: 100
        }));
        const applications = yield offers_1.searchApplications(req);
        res.render('ticketType/update', {
            message: message,
            errors: errors,
            forms: forms,
            addOns: searchAddOnsResult.data,
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
/**
 * COA券種インポート
 */
ticketTypeMasterRouter.post('/importFromCOA', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // インポート対象の施設ブランチコードを検索
        const { data } = yield placeService.searchMovieTheaters({ limit: 100 });
        // タスク作成
        const taskAttributes = data.map((d) => {
            return {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                name: sdk_1.chevre.factory.taskName.ImportOffersFromCOA,
                status: sdk_1.chevre.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 1,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    theaterCode: d.branchCode
                }
            };
        });
        const tasks = yield Promise.all(taskAttributes.map((a) => __awaiter(void 0, void 0, void 0, function* () {
            return taskService.create(a);
        })));
        res.status(http_status_1.CREATED)
            .json(tasks);
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let offerCategory;
        if (typeof req.body.category === 'string' && req.body.category.length > 0) {
            const selectedCategory = JSON.parse(req.body.category);
            const searchOfferCategoryTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
                codeValue: { $eq: selectedCategory.codeValue }
            });
            if (searchOfferCategoryTypesResult.data.length === 0) {
                throw new Error('オファーカテゴリーが見つかりません');
            }
            offerCategory = searchOfferCategoryTypesResult.data[0];
        }
        const availableAddOn = [];
        let addOnItemOfferedIds = (_b = (_a = req.body.addOn) === null || _a === void 0 ? void 0 : _a.itemOffered) === null || _b === void 0 ? void 0 : _b.id;
        if (typeof addOnItemOfferedIds === 'string') {
            addOnItemOfferedIds = [addOnItemOfferedIds];
        }
        if (Array.isArray(addOnItemOfferedIds)) {
            for (const addOnItemOfferedId of addOnItemOfferedIds) {
                const addOn = yield productService.findById({
                    id: addOnItemOfferedId
                });
                if (addOn.hasOfferCatalog === undefined) {
                    throw new Error(`アドオン '${addOn.productID}' にはカタログが登録されていません`);
                }
                availableAddOn.push({
                    project: addOn.project,
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    itemOffered: {
                        typeOf: addOn.typeOf,
                        id: addOn.id,
                        name: addOn.name
                    },
                    priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY
                });
            }
        }
        const availability = sdk_1.chevre.factory.itemAvailability.InStock;
        // 利用可能なアプリケーション設定
        const availableAtOrFrom = [];
        const availableAtOrFromParams = (_c = req.body.availableAtOrFrom) === null || _c === void 0 ? void 0 : _c.id;
        if (Array.isArray(availableAtOrFromParams)) {
            availableAtOrFromParams.forEach((applicationId) => {
                if (typeof applicationId === 'string' && applicationId.length > 0) {
                    availableAtOrFrom.push({ id: applicationId });
                }
            });
        }
        else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
            availableAtOrFrom.push({ id: availableAtOrFromParams });
        }
        // スマシの新旧クライアント対応
        const availableClientIds = availableAtOrFrom.map((a) => a.id);
        if (typeof offers_1.SMART_THEATER_CLIENT_OLD === 'string' && offers_1.SMART_THEATER_CLIENT_OLD.length > 0
            && typeof offers_1.SMART_THEATER_CLIENT_NEW === 'string' && offers_1.SMART_THEATER_CLIENT_NEW.length > 0) {
            const oldClientAvailable = availableClientIds.includes(offers_1.SMART_THEATER_CLIENT_OLD);
            const newClientAvailable = availableClientIds.includes(offers_1.SMART_THEATER_CLIENT_NEW);
            if (oldClientAvailable && !newClientAvailable) {
                availableAtOrFrom.push({ id: offers_1.SMART_THEATER_CLIENT_NEW });
            }
        }
        const referenceQuantityValue = Number(req.body.seatReservationUnit);
        const referenceQuantity = {
            typeOf: 'QuantitativeValue',
            value: referenceQuantityValue,
            unitCode: sdk_1.chevre.factory.unitCode.C62
        };
        const eligibleQuantityMinValue = (req.body.priceSpecification !== undefined
            && req.body.priceSpecification.eligibleQuantity !== undefined
            && req.body.priceSpecification.eligibleQuantity.minValue !== undefined
            && req.body.priceSpecification.eligibleQuantity.minValue !== '')
            ? Number(req.body.priceSpecification.eligibleQuantity.minValue)
            : undefined;
        const eligibleQuantityMaxValue = (req.body.priceSpecification !== undefined
            && req.body.priceSpecification.eligibleQuantity !== undefined
            && req.body.priceSpecification.eligibleQuantity.maxValue !== undefined
            && req.body.priceSpecification.eligibleQuantity.maxValue !== '')
            ? Number(req.body.priceSpecification.eligibleQuantity.maxValue)
            : undefined;
        const eligibleQuantity = (eligibleQuantityMinValue !== undefined || eligibleQuantityMaxValue !== undefined)
            ? {
                typeOf: 'QuantitativeValue',
                minValue: eligibleQuantityMinValue,
                maxValue: eligibleQuantityMaxValue,
                unitCode: sdk_1.chevre.factory.unitCode.C62
            }
            : undefined;
        const eligibleTransactionVolumePrice = (req.body.priceSpecification !== undefined
            && req.body.priceSpecification.eligibleTransactionVolume !== undefined
            && req.body.priceSpecification.eligibleTransactionVolume.price !== undefined
            && req.body.priceSpecification.eligibleTransactionVolume.price !== '')
            ? Number(req.body.priceSpecification.eligibleTransactionVolume.price)
            : undefined;
        // tslint:disable-next-line:max-line-length
        const eligibleTransactionVolume = (eligibleTransactionVolumePrice !== undefined)
            ? {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: sdk_1.chevre.factory.priceSpecificationType.PriceSpecification,
                price: eligibleTransactionVolumePrice,
                priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY,
                valueAddedTaxIncluded: true
            }
            : undefined;
        let appliesToMovieTicketType;
        let appliesToMovieTicketServiceOutputType;
        if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
            const selectedMovieTicketType = JSON.parse(req.body.appliesToMovieTicket);
            const searchMovieTicketTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                codeValue: { $eq: selectedMovieTicketType.codeValue },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } }
            });
            const movieTicketType = searchMovieTicketTypesResult.data.shift();
            if (movieTicketType === undefined) {
                throw new Error('適用決済カード区分が見つかりません');
            }
            appliesToMovieTicketType = movieTicketType.codeValue;
            appliesToMovieTicketServiceOutputType = (_d = movieTicketType.paymentMethod) === null || _d === void 0 ? void 0 : _d.typeOf;
        }
        // const eligibleCustomerType: string[] | undefined = (body.eligibleCustomerType !== undefined && body.eligibleCustomerType !== '')
        //     ? [body.eligibleCustomerType]
        //     : undefined;
        const accounting = {
            typeOf: 'Accounting',
            // operatingRevenue: <any>undefined,
            accountsReceivable: Number(req.body.accountsReceivable) * referenceQuantityValue
        };
        if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
            const selectedAccountTitle = JSON.parse(req.body.accounting);
            accounting.operatingRevenue = {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: 'AccountTitle',
                codeValue: selectedAccountTitle.codeValue
                // identifier: selectedAccountTitle.codeValue,
                // name: ''
            };
        }
        let nameFromJson = {};
        if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
            try {
                nameFromJson = JSON.parse(req.body.nameStr);
            }
            catch (error) {
                throw new Error(`高度な名称の型が不適切です ${error.message}`);
            }
        }
        // 適用座席区分があれば設定
        let eligibleSeatingTypes;
        if (typeof req.body.eligibleSeatingType === 'string' && req.body.eligibleSeatingType.length > 0) {
            const selectedSeatingType = JSON.parse(req.body.eligibleSeatingType);
            const searchSeatingTypeResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                codeValue: { $eq: selectedSeatingType.codeValue },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
            });
            const seatingType = searchSeatingTypeResult.data.shift();
            if (seatingType === undefined) {
                throw new Error(`Seating Type ${selectedSeatingType.codeValue} Not Found`);
            }
            eligibleSeatingTypes = [{
                    project: seatingType.project,
                    typeOf: seatingType.typeOf,
                    id: seatingType.id,
                    codeValue: seatingType.codeValue,
                    inCodeSet: seatingType.inCodeSet
                }];
        }
        // 適用メンバーシップ区分があれば設定
        let eligibleMembershipTypes;
        if (typeof req.body.eligibleMembershipType === 'string' && req.body.eligibleMembershipType.length > 0) {
            const selectedMembershipType = JSON.parse(req.body.eligibleMembershipType);
            const searchMembershipTypeResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                codeValue: { $eq: selectedMembershipType.codeValue },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } }
            });
            const membershipType = searchMembershipTypeResult.data.shift();
            if (membershipType === undefined) {
                throw new Error(`Membership Type ${selectedMembershipType.codeValue} Not Found`);
            }
            eligibleMembershipTypes = [{
                    project: membershipType.project,
                    typeOf: membershipType.typeOf,
                    id: membershipType.id,
                    codeValue: membershipType.codeValue,
                    inCodeSet: membershipType.inCodeSet
                }];
        }
        // 適用口座があれば設定
        let eligibleMonetaryAmount;
        // if (Array.isArray(req.body.eligibleMonetaryAmount) && req.body.eligibleMonetaryAmount.length > 0
        //     && typeof req.body.eligibleMonetaryAmount[0].currency === 'string' && req.body.eligibleMonetaryAmount[0].currency.length > 0
        //     && typeof req.body.eligibleMonetaryAmount[0].value === 'string' && req.body.eligibleMonetaryAmount[0].value.length > 0) {
        //     eligibleMonetaryAmount = [{
        //         typeOf: 'MonetaryAmount',
        //         currency: req.body.eligibleMonetaryAmount[0].currency,
        //         value: Number(req.body.eligibleMonetaryAmount[0].value)
        //     }];
        // }
        if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0
            && typeof req.body.eligibleMonetaryAmountValue === 'string' && req.body.eligibleMonetaryAmountValue.length > 0) {
            const selectedCurrencyType = JSON.parse(req.body.eligibleMonetaryAmount);
            eligibleMonetaryAmount = [{
                    typeOf: 'MonetaryAmount',
                    currency: selectedCurrencyType.codeValue,
                    value: Number(req.body.eligibleMonetaryAmountValue)
                }];
        }
        // 適用サブ予約条件があれば設定
        let eligibleSubReservation;
        if (typeof req.body.eligibleSubReservation === 'string' && req.body.eligibleSubReservation.length > 0
            && typeof req.body.eligibleSubReservationAmount === 'string' && req.body.eligibleSubReservationAmount.length > 0) {
            const selectedSubReservationSeatingType = JSON.parse(req.body.eligibleSubReservation);
            const searchSeatingTypeResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                codeValue: { $eq: selectedSubReservationSeatingType.codeValue },
                inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
            });
            const seatingType = searchSeatingTypeResult.data.shift();
            if (seatingType === undefined) {
                throw new Error(`Seating Type ${selectedSubReservationSeatingType.codeValue} Not Found`);
            }
            eligibleSubReservation = [{
                    typeOfGood: {
                        seatingType: seatingType.codeValue
                    },
                    amountOfThisGood: Number(req.body.eligibleSubReservationAmount)
                }];
        }
        let validFrom;
        if (typeof req.body.validFrom === 'string' && req.body.validFrom.length > 0) {
            validFrom = moment(`${req.body.validFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate();
            // validFrom = moment(req.body.validFrom)
            //     .toDate();
        }
        let validThrough;
        if (typeof req.body.validThrough === 'string' && req.body.validThrough.length > 0) {
            validThrough = moment(`${req.body.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate();
            // validThrough = moment(req.body.validThrough)
            //     .toDate();
        }
        const itemOffered = {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: productType_1.ProductType.EventService
        };
        let color = 'rgb(51, 51, 51)';
        if (typeof req.body.color === 'string' && req.body.color.length > 0) {
            color = req.body.color;
        }
        return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: 'Offer', priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY, id: req.body.id, identifier: req.body.identifier, name: Object.assign(Object.assign({}, nameFromJson), { ja: req.body.name.ja, en: req.body.name.en }), description: req.body.description, alternateName: { ja: req.body.alternateName.ja, en: '' }, availableAtOrFrom: availableAtOrFrom, availability: availability, itemOffered: itemOffered, 
            // eligibleCustomerType: eligibleCustomerType,
            priceSpecification: Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.priceSpecificationType.UnitPriceSpecification, name: req.body.name, price: Number(req.body.price) * referenceQuantityValue, priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY, valueAddedTaxIncluded: true, eligibleQuantity: eligibleQuantity, eligibleTransactionVolume: eligibleTransactionVolume, referenceQuantity: referenceQuantity, accounting: accounting }, (typeof appliesToMovieTicketType === 'string' && appliesToMovieTicketType.length > 0)
                ? {
                    appliesToMovieTicket: {
                        typeOf: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                        serviceType: appliesToMovieTicketType,
                        serviceOutput: { typeOf: appliesToMovieTicketServiceOutputType }
                    },
                    // 互換性維持対応
                    appliesToMovieTicketType: appliesToMovieTicketType
                }
                : undefined), addOn: availableAddOn, additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined }, (typeof color === 'string')
            ? {
                color: color
            }
            : undefined), (offerCategory !== undefined)
            ? {
                category: {
                    project: offerCategory.project,
                    id: offerCategory.id,
                    codeValue: offerCategory.codeValue
                }
            }
            : undefined), (Array.isArray(eligibleSeatingTypes))
            ? {
                eligibleSeatingType: eligibleSeatingTypes
            }
            : undefined), (Array.isArray(eligibleMembershipTypes))
            ? {
                eligibleMembershipType: eligibleMembershipTypes
            }
            : undefined), (eligibleMonetaryAmount !== undefined)
            ? {
                eligibleMonetaryAmount: eligibleMonetaryAmount
            }
            : undefined), (eligibleSubReservation !== undefined)
            ? {
                eligibleSubReservation: eligibleSubReservation
            }
            : undefined), (validFrom instanceof Date)
            ? {
                validFrom: validFrom
            }
            : undefined), (validThrough instanceof Date)
            ? {
                validThrough: validThrough
            }
            : undefined), (!isNew)
            // ...{
            //     $unset: { eligibleCustomerType: 1 }
            // },
            ? {
                $unset: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof color !== 'string') ? { color: 1 } : undefined), (offerCategory === undefined) ? { category: 1 } : undefined), (eligibleSeatingTypes === undefined) ? { eligibleSeatingType: 1 } : undefined), (eligibleMembershipTypes === undefined) ? { eligibleMembershipType: 1 } : undefined), (eligibleMonetaryAmount === undefined) ? { eligibleMonetaryAmount: 1 } : undefined), (eligibleSubReservation === undefined) ? { eligibleSubReservation: 1 } : undefined), (validFrom === undefined) ? { validFrom: 1 } : undefined), (validThrough === undefined) ? { validThrough: 1 } : undefined)
            }
            : undefined);
    });
}
/**
 * 券種マスタ新規登録画面検証
 */
function validateFormAdd() {
    return [
        express_validator_1.body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            // .isAlphanumeric()
            .matches(/^[0-9a-zA-Z\-_]+$/)
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', 30)),
        // 名称
        express_validator_1.body('name.ja', Message.Common.required.replace('$fieldName$', '名称'))
            .notEmpty(),
        express_validator_1.body('name.ja', Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        // 英語名称
        express_validator_1.body('name.en', Message.Common.required.replace('$fieldName$', '英語名称'))
            .notEmpty(),
        express_validator_1.body('name.en', Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME_EN))
            .isLength({ max: NAME_MAX_LENGTH_NAME_EN }),
        express_validator_1.body('alternateName.ja', Message.Common.required.replace('$fieldName$', '代替名称'))
            .notEmpty(),
        express_validator_1.body('alternateName.ja', Message.Common.getMaxLength('代替名称', NAME_MAX_LENGTH_NAME_JA))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        // 購入席単位追加
        express_validator_1.body('seatReservationUnit', Message.Common.required.replace('$fieldName$', '購入席単位追加'))
            .notEmpty(),
        express_validator_1.body('price')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '発生金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLengthHalfByte('発生金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        express_validator_1.body('accountsReceivable')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '売上金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLengthHalfByte('売上金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        express_validator_1.body('eligibleMonetaryAmountValue')
            .optional()
            .if((value) => typeof value === 'string' && value.length > 0)
            .isNumeric()
            .withMessage('数値を入力してください')
            .isLength({ max: 10 })
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        express_validator_1.body('eligibleSubReservationAmount')
            .optional()
            .if((value) => typeof value === 'string' && value.length > 0)
            .isNumeric()
            .withMessage('数値を入力してください')
            .isLength({ max: 10 })
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')
    ];
}
exports.default = ticketTypeMasterRouter;
