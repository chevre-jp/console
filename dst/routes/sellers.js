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
exports.sellersRouter = void 0;
/**
 * 販売者ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const Message = require("../message");
const offers_1 = require("./offers");
const NUM_ADDITIONAL_PROPERTY = 10;
const NUM_RETURN_POLICY = 1;
const NAME_MAX_LENGTH_NAME = 64;
const DEFAULT_PLACE_ORDER_TRANSACTION_DURATION_IN_SECONDS = (typeof process.env.DEFAULT_PLACE_ORDER_TRANSACTION_DURATION_IN_SECONDS === 'string')
    ? Number(process.env.DEFAULT_PLACE_ORDER_TRANSACTION_DURATION_IN_SECONDS)
    // tslint:disable-next-line:no-magic-numbers
    : 900; // 15 minutes
const sellersRouter = (0, express_1.Router)();
exports.sellersRouter = sellersRouter;
// tslint:disable-next-line:use-default-type-parameter
sellersRouter.all('/new', ...validate(true), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // 検証
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                req.body.id = '';
                let seller = yield createFromBody(req, true);
                seller = yield sellerService.create(seller);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/sellers/${seller.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], hasMerchantReturnPolicy: [], paymentAccepted: [], name: {}, alternateName: {}, makesOffer: [] }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (forms.hasMerchantReturnPolicy.length < NUM_RETURN_POLICY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.hasMerchantReturnPolicy.push(...[...Array(NUM_RETURN_POLICY - forms.hasMerchantReturnPolicy.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // 対応決済方法を補完
        if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
            forms.paymentAccepted = req.body.paymentAccepted.map((v) => JSON.parse(v));
        }
        else {
            forms.paymentAccepted = [];
        }
    }
    const applications = yield (0, offers_1.searchApplications)(req);
    res.render('sellers/new', {
        message: message,
        errors: errors,
        forms: forms,
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
sellersRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const searchConditions = {
            limit: limit,
            page: page,
            sort: { branchCode: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            branchCode: {
                $regex: (typeof ((_a = req.query.branchCode) === null || _a === void 0 ? void 0 : _a.$regex) === 'string' && req.query.branchCode.$regex.length > 0)
                    ? req.query.branchCode.$regex
                    : undefined
            },
            name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
        };
        let data;
        const searchResult = yield sellerService.search(searchConditions);
        data = searchResult.data;
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((t) => {
                return Object.assign(Object.assign({}, t), { makesOfferCount: (Array.isArray(t.makesOffer))
                        ? t.makesOffer.length
                        : 0, paymentAcceptedCount: (Array.isArray(t.paymentAccepted))
                        ? t.paymentAccepted.length
                        : 0, hasMerchantReturnPolicyCount: (Array.isArray(t.hasMerchantReturnPolicy))
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
sellersRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const seller = yield sellerService.findById({ id: String(req.params.id) });
        res.json(seller);
    }
    catch (err) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: err.message
        });
    }
}));
sellersRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const seller = yield sellerService.findById({ id: req.params.id });
        yield preDelete(req, seller);
        yield sellerService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, seller) {
    return __awaiter(this, void 0, void 0, function* () {
        // 施設が存在するかどうか
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            parentOrganization: { id: { $eq: seller.id } }
        });
        if (searchMovieTheatersResult.data.length > 0) {
            throw new Error('関連する施設が存在します');
        }
    });
}
// tslint:disable-next-line:use-default-type-parameter
sellersRouter.all('/:id/update', ...validate(false), 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const sellerService = new sdk_1.chevre.service.Seller({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        let seller = yield sellerService.findById({ id: req.params.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    seller = yield createFromBody(req, false);
                    yield sellerService.update({ id: String(seller.id), attributes: seller });
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({ paymentAccepted: [], hasMerchantReturnPolicy: [] }, seller), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.hasMerchantReturnPolicy.length < NUM_RETURN_POLICY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.hasMerchantReturnPolicy.push(...[...Array(NUM_RETURN_POLICY - forms.hasMerchantReturnPolicy.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // 対応決済方法を補完
            if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
                forms.paymentAccepted = req.body.paymentAccepted.map((v) => JSON.parse(v));
            }
            else {
                forms.paymentAccepted = [];
            }
        }
        else {
            if (Array.isArray(seller.paymentAccepted) && seller.paymentAccepted.length > 0) {
                forms.paymentAccepted = seller.paymentAccepted.map((p) => {
                    return { codeValue: p.paymentMethodType };
                });
            }
            else {
                forms.paymentAccepted = [];
            }
        }
        const applications = yield (0, offers_1.searchApplications)(req);
        res.render('sellers/update', {
            message: message,
            errors: errors,
            forms: forms,
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
sellersRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('sellers/index', {
        message: ''
    });
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let nameFromJson = {};
        if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
            try {
                nameFromJson = JSON.parse(req.body.nameStr);
            }
            catch (error) {
                throw new Error(`高度な名称の型が不適切です ${error.message}`);
            }
        }
        let hasMerchantReturnPolicy;
        // hasMerchantReturnPolicyの指定があればひとつだけ適用
        if (Array.isArray(req.body.hasMerchantReturnPolicy) && req.body.hasMerchantReturnPolicy.length > 0) {
            const policyFromBody = req.body.hasMerchantReturnPolicy[0];
            const merchantReturnDaysFromBody = policyFromBody.merchantReturnDays;
            const restockingFeeValueFromBody = (_a = policyFromBody.restockingFee) === null || _a === void 0 ? void 0 : _a.value;
            const policyUrlFromBody = policyFromBody.url;
            if (typeof merchantReturnDaysFromBody === 'number' && typeof restockingFeeValueFromBody === 'number') {
                // 厳密に型をコントロール(2022-08-03~)
                // merchantReturnDays,restockingFeeを要定義
                hasMerchantReturnPolicy = [Object.assign({ merchantReturnDays: merchantReturnDaysFromBody, restockingFee: {
                            typeOf: 'MonetaryAmount',
                            currency: sdk_1.chevre.factory.priceCurrency.JPY,
                            value: restockingFeeValueFromBody
                        }, typeOf: 'MerchantReturnPolicy' }, (typeof policyUrlFromBody === 'string' && policyUrlFromBody.length > 0)
                        ? { url: policyUrlFromBody }
                        : undefined)];
            }
        }
        let paymentAccepted;
        if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
            try {
                paymentAccepted = req.body.paymentAccepted.map((p) => {
                    const selectedPaymentMethod = JSON.parse(p);
                    return { paymentMethodType: selectedPaymentMethod.codeValue };
                });
            }
            catch (error) {
                throw new Error(`対応決済方法の型が不適切です ${error.message}`);
            }
        }
        const branchCode = String(req.body.branchCode);
        const telephone = req.body.telephone;
        const url = req.body.url;
        let makesOffer = [];
        if (!Array.isArray(req.body.makesOffer)) {
            req.body.makesOffer = [req.body.makesOffer];
        }
        if (Array.isArray(req.body.makesOffer)) {
            makesOffer = req.body.makesOffer
                .filter((offer) => {
                var _a;
                return Array.isArray(offer === null || offer === void 0 ? void 0 : offer.availableAtOrFrom)
                    && typeof ((_a = offer === null || offer === void 0 ? void 0 : offer.availableAtOrFrom[0]) === null || _a === void 0 ? void 0 : _a.id) === 'string';
            })
                .map((offer) => {
                var _a;
                const eligibleTransactionDurationMaxValue = (_a = offer.eligibleTransactionDuration) === null || _a === void 0 ? void 0 : _a.maxValue;
                const eligibleTransactionDuration = {
                    typeOf: 'QuantitativeValue',
                    unitCode: sdk_1.chevre.factory.unitCode.Sec,
                    maxValue: (typeof eligibleTransactionDurationMaxValue === 'number')
                        ? Number(eligibleTransactionDurationMaxValue)
                        // Default値を設定(2022-11-26~)
                        : DEFAULT_PLACE_ORDER_TRANSACTION_DURATION_IN_SECONDS
                };
                return {
                    availableAtOrFrom: [{ id: offer.availableAtOrFrom[0].id }],
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    eligibleTransactionDuration
                };
            });
        }
        return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.organizationType.Corporation, branchCode, id: req.body.id, makesOffer, name: Object.assign(Object.assign({}, nameFromJson), { ja: req.body.name.ja, en: req.body.name.en }), additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined }, (typeof telephone === 'string' && telephone.length > 0) ? { telephone } : undefined), (typeof url === 'string' && url.length > 0) ? { url } : undefined), (hasMerchantReturnPolicy !== undefined) ? { hasMerchantReturnPolicy } : undefined), (paymentAccepted !== undefined) ? { paymentAccepted } : undefined), (!isNew)
            ? {
                $unset: Object.assign(Object.assign(Object.assign(Object.assign({ parentOrganization: 1 }, (typeof telephone !== 'string' || telephone.length === 0) ? { telephone: 1 } : undefined), (typeof url !== 'string' || url.length === 0) ? { url: 1 } : undefined), (hasMerchantReturnPolicy === undefined) ? { hasMerchantReturnPolicy: 1 } : undefined), (paymentAccepted === undefined) ? { paymentAccepted: 1 } : undefined)
            }
            : undefined);
    });
}
function validate(isNew) {
    return [
        ...(isNew)
            ? [
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
                    .withMessage('予約語のため使用できません')
            ]
            : [
                (0, express_validator_1.body)('branchCode')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .matches(/^[0-9a-zA-Z]+$/)
                    .withMessage('半角英数字で入力してください')
                    .isLength({ max: 12 })
                    .withMessage('~12文字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
            ],
        (0, express_validator_1.body)(['name.ja', 'name.en'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME)),
        (0, express_validator_1.body)(['url'])
            .optional()
            .if((value) => String(value).length > 0)
            .isURL({})
            .isLength({ max: 256 })
            .withMessage('URLの形式が不適切です'),
        (0, express_validator_1.body)('hasMerchantReturnPolicy')
            .optional()
            .isArray({ min: 0, max: NUM_RETURN_POLICY }),
        (0, express_validator_1.body)('hasMerchantReturnPolicy.*.merchantReturnDays')
            .optional()
            .if((value) => String(value).length > 0)
            .isInt()
            .toInt()
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        (0, express_validator_1.body)('hasMerchantReturnPolicy.*.restockingFee.value')
            .optional()
            .if((value) => String(value).length > 0)
            .isInt()
            .toInt()
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        (0, express_validator_1.body)('makesOffer.*.eligibleTransactionDuration.maxValue')
            .optional()
            .if((value) => String(value).length > 0)
            .isInt({ min: 60, max: 3600 })
            .toInt()
            .withMessage(() => '60~3600秒の間で入力してください')
    ];
}
