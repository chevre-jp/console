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
 * 価格仕様ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
// import { categoryCodeSets } from '../factory/categoryCodeSet';
const priceSpecificationType_1 = require("../factory/priceSpecificationType");
const priceSpecificationsRouter = express_1.Router();
priceSpecificationsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('priceSpecifications/index', {
        message: '',
        PriceSpecificationType: sdk_1.chevre.factory.priceSpecificationType,
        priceSpecificationTypes: priceSpecificationType_1.priceSpecificationTypes,
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier
    });
}));
priceSpecificationsRouter.get('/search', 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const priceSpecificationService = new sdk_1.chevre.service.PriceSpecification({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // 適用区分検索
        // const searchApplicableCategoryCodesResult = await categoryCodeService.search({
        //     limit: 100,
        //     project: { id: { $eq: req.project.id } },
        //     inCodeSet: {
        //         identifier: {
        //             $in: [
        //                 chevre.factory.categoryCode.CategorySetIdentifier.SeatingType,
        //                 chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType,
        //                 chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType,
        //                 chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType
        //             ]
        //         }
        //     }
        // });
        // const applicableCategoryCodes = searchApplicableCategoryCodesResult.data;
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield priceSpecificationService.search({
            limit: limit,
            page: page,
            sort: { price: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            typeOf: (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0)
                ? req.query.typeOf
                : undefined,
            appliesToMovieTicket: {
                serviceTypes: (typeof req.query.appliesToMovieTicket === 'string' && req.query.appliesToMovieTicket.length > 0)
                    ? [req.query.appliesToMovieTicket]
                    : undefined
            },
            appliesToCategoryCode: Object.assign({}, (typeof ((_a = req.query.appliesToCategoryCode) === null || _a === void 0 ? void 0 : _a.$elemMatch) === 'string'
                && req.query.appliesToCategoryCode.$elemMatch.length > 0)
                ? {
                    $elemMatch: {
                        codeValue: { $eq: JSON.parse(req.query.appliesToCategoryCode.$elemMatch).codeValue },
                        'inCodeSet.identifier': {
                            $eq: JSON.parse(req.query.appliesToCategoryCode.$elemMatch).inCodeSet.identifier
                        }
                    }
                }
                : {})
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((d) => {
                const appliesToCategoryCode = 
                // tslint:disable-next-line:max-line-length
                (Array.isArray(d.appliesToCategoryCode))
                    // tslint:disable-next-line:max-line-length
                    ? d.appliesToCategoryCode[0]
                    : undefined;
                // const appliesToMovieTicket =
                //     // tslint:disable-next-line:max-line-length
                // tslint:disable-next-line:max-line-length
                //     (<chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification>>d).appliesToMovieTicket;
                // const appliesToVideoFormat =
                //     // tslint:disable-next-line:max-line-length
                // tslint:disable-next-line:max-line-length
                //     (<chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification>>d).appliesToVideoFormat;
                // const categoryCodeSet = categoryCodeSets.find(
                //     (c) => c.identifier === appliesToCategoryCode?.inCodeSet?.identifier
                // );
                const priceSpecificationType = priceSpecificationType_1.priceSpecificationTypes.find((p) => p.codeValue === d.typeOf);
                // const applicableCategoryCode = applicableCategoryCodes.find(
                //     (categoryCode) => categoryCode.codeValue === appliesToCategoryCode?.codeValue
                //         && categoryCode.inCodeSet.identifier === appliesToCategoryCode?.inCodeSet?.identifier
                // );
                // const applicableMovieTicket = applicableCategoryCodes.find(
                //     (categoryCode) => categoryCode.codeValue === appliesToMovieTicket?.serviceType
                //         && categoryCode.inCodeSet.identifier === chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType
                //         && categoryCode.paymentMethod?.typeOf === appliesToMovieTicket?.serviceOutput?.typeOf
                // );
                // const applicableVideoFormat = applicableCategoryCodes.find(
                //     (categoryCode) => categoryCode.codeValue === appliesToVideoFormat
                //         && categoryCode.inCodeSet.identifier === chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType
                // );
                return Object.assign(Object.assign({}, d), { priceSpecificationTypeName: priceSpecificationType === null || priceSpecificationType === void 0 ? void 0 : priceSpecificationType.name, 
                    // appliesToCategoryCodeSetName: categoryCodeSet?.name,
                    appliesToCategoryCode: appliesToCategoryCode });
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
priceSpecificationsRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                let priceSpecification = yield createFromBody(req, true);
                const priceSpecificationService = new sdk_1.chevre.service.PriceSpecification({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                priceSpecification = yield priceSpecificationService.create(priceSpecification);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/priceSpecifications/${priceSpecification.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({}, req.body);
    if (req.method === 'POST') {
        // 適用区分を保管
        if (typeof req.body.appliesToCategoryCode === 'string' && req.body.appliesToCategoryCode.length > 0) {
            forms.appliesToCategoryCode = JSON.parse(req.body.appliesToCategoryCode);
        }
        else {
            forms.appliesToCategoryCode = undefined;
        }
        // 適用決済カード区分を保管
        if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
            forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
        }
        else {
            forms.appliesToMovieTicket = undefined;
        }
        // 適用上映方式を保管
        if (typeof req.body.appliesToVideoFormat === 'string' && req.body.appliesToVideoFormat.length > 0) {
            forms.appliesToVideoFormat = JSON.parse(req.body.appliesToVideoFormat);
        }
        else {
            forms.appliesToVideoFormat = undefined;
        }
    }
    res.render('priceSpecifications/new', {
        message: message,
        errors: errors,
        forms: forms,
        PriceSpecificationType: sdk_1.chevre.factory.priceSpecificationType,
        priceSpecificationTypes: priceSpecificationType_1.priceSpecificationTypes,
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier
    });
}));
// tslint:disable-next-line:use-default-type-parameter
priceSpecificationsRouter.all('/:id/update', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g;
    try {
        let message = '';
        let errors = {};
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const priceSpecificationService = new sdk_1.chevre.service.PriceSpecification({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let priceSpecification = yield priceSpecificationService.findById({
            id: req.params.id
        });
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                // コンテンツDB登録
                try {
                    priceSpecification = Object.assign(Object.assign({}, yield createFromBody(req, false)), { id: priceSpecification.id });
                    yield priceSpecificationService.update(priceSpecification);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({}, priceSpecification), req.body);
        if (req.method === 'POST') {
            // 適用区分を保管
            if (typeof req.body.appliesToCategoryCode === 'string' && req.body.appliesToCategoryCode.length > 0) {
                forms.appliesToCategoryCode = JSON.parse(req.body.appliesToCategoryCode);
            }
            else {
                forms.appliesToCategoryCode = undefined;
            }
            // 適用決済カード区分を保管
            if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
            }
            else {
                forms.appliesToMovieTicket = undefined;
            }
            // 適用上映方式を保管
            if (typeof req.body.appliesToVideoFormat === 'string' && req.body.appliesToVideoFormat.length > 0) {
                forms.appliesToVideoFormat = JSON.parse(req.body.appliesToVideoFormat);
            }
            else {
                forms.appliesToVideoFormat = undefined;
            }
        }
        else {
            if (Array.isArray(priceSpecification.appliesToCategoryCode)
                && priceSpecification.appliesToCategoryCode.length > 0) {
                const searchAppliesToCategoryCodesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: {
                        identifier: {
                            $in: [
                                sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType,
                                sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType,
                                sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType,
                                sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType
                            ]
                        }
                    },
                    codeValue: { $eq: priceSpecification.appliesToCategoryCode[0].codeValue }
                });
                forms.appliesToCategoryCode = searchAppliesToCategoryCodesResult.data[0];
            }
            else {
                forms.appliesToCategoryCode = undefined;
            }
            if (typeof ((_b = priceSpecification.appliesToMovieTicket) === null || _b === void 0 ? void 0 : _b.serviceType) === 'string'
                && typeof ((_d = (_c = priceSpecification.appliesToMovieTicket) === null || _c === void 0 ? void 0 : _c.serviceOutput) === null || _d === void 0 ? void 0 : _d.typeOf) === 'string') {
                const searchAppliesToMovieTicketsResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: {
                        identifier: {
                            $in: [
                                sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType
                            ]
                        }
                    },
                    codeValue: {
                        $eq: (_e = priceSpecification.appliesToMovieTicket) === null || _e === void 0 ? void 0 : _e.serviceType
                    },
                    paymentMethod: {
                        typeOf: {
                            $eq: (_g = (_f = priceSpecification.appliesToMovieTicket) === null || _f === void 0 ? void 0 : _f.serviceOutput) === null || _g === void 0 ? void 0 : _g.typeOf
                        }
                    }
                });
                forms.appliesToMovieTicket = searchAppliesToMovieTicketsResult.data[0];
            }
            else {
                forms.appliesToMovieTicket = undefined;
            }
            if (typeof priceSpecification.appliesToVideoFormat === 'string'
                && priceSpecification.appliesToVideoFormat.length > 0) {
                const searchAppliesToVideoFormatsResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: {
                        identifier: {
                            $in: [
                                sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType
                            ]
                        }
                    },
                    codeValue: { $eq: priceSpecification.appliesToVideoFormat }
                });
                forms.appliesToVideoFormat = searchAppliesToVideoFormatsResult.data[0];
            }
            else {
                forms.appliesToVideoFormat = undefined;
            }
        }
        res.render('priceSpecifications/update', {
            message: message,
            errors: errors,
            forms: forms,
            PriceSpecificationType: sdk_1.chevre.factory.priceSpecificationType,
            priceSpecificationTypes: priceSpecificationType_1.priceSpecificationTypes,
            CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier
        });
    }
    catch (error) {
        next(error);
    }
}));
priceSpecificationsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const priceSpecificationService = new sdk_1.chevre.service.PriceSpecification({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // validation
        const priceSpecification = yield priceSpecificationService.findById({ id: req.params.id });
        yield preDelete(req, priceSpecification);
        yield priceSpecificationService.deleteById({ id: req.params.id });
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
    });
}
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req, isNew) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let appliesToCategoryCode;
        let appliesToVideoFormat;
        let appliesToMovieTicketType;
        let appliesToMovieTicketServiceOutputTypeOf;
        switch (req.body.typeOf) {
            case sdk_1.chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification:
                appliesToCategoryCode =
                    (typeof req.body.appliesToCategoryCode === 'string' && req.body.appliesToCategoryCode.length > 0)
                        ? JSON.parse(req.body.appliesToCategoryCode)
                        : undefined;
                appliesToVideoFormat = undefined;
                break;
            case sdk_1.chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification:
                const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                const selectedMovieTicketType = JSON.parse(req.body.appliesToMovieTicket);
                const searchMovieTicketTypesResult = yield categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } },
                    codeValue: { $eq: selectedMovieTicketType.codeValue },
                    paymentMethod: { typeOf: { $eq: (_a = selectedMovieTicketType.paymentMethod) === null || _a === void 0 ? void 0 : _a.typeOf } }
                });
                const movieTicketTypeCharge = searchMovieTicketTypesResult.data.shift();
                if (movieTicketTypeCharge === undefined) {
                    throw new Error('適用決済カード区分が見つかりません');
                }
                appliesToMovieTicketType = movieTicketTypeCharge.codeValue;
                appliesToMovieTicketServiceOutputTypeOf = (_b = movieTicketTypeCharge.paymentMethod) === null || _b === void 0 ? void 0 : _b.typeOf;
                // MovieTicketTypeChargeSpecificationの場合、必須
                if (typeof appliesToMovieTicketType !== 'string' || appliesToMovieTicketType.length === 0
                    || typeof appliesToMovieTicketServiceOutputTypeOf !== 'string' || appliesToMovieTicketServiceOutputTypeOf.length === 0) {
                    throw new Error('適用決済カード区分が指定されていません');
                }
                appliesToCategoryCode = undefined;
                const selectedVideoFormat = JSON.parse(req.body.appliesToVideoFormat);
                appliesToVideoFormat = selectedVideoFormat.codeValue;
                // MovieTicketTypeChargeSpecificationの場合、必須
                if (typeof appliesToVideoFormat !== 'string' || appliesToVideoFormat.length === 0) {
                    throw new Error('決済カード適用上映方式が指定されていません');
                }
                break;
            default:
        }
        return Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: req.body.typeOf, price: Number(req.body.price), priceCurrency: sdk_1.chevre.factory.priceCurrency.JPY, name: req.body.name, valueAddedTaxIncluded: true }, (appliesToCategoryCode !== undefined)
            ? {
                appliesToCategoryCode: [{
                        project: { typeOf: req.project.typeOf, id: req.project.id },
                        typeOf: 'CategoryCode',
                        codeValue: appliesToCategoryCode.codeValue,
                        inCodeSet: {
                            typeOf: 'CategoryCodeSet',
                            identifier: appliesToCategoryCode.inCodeSet.identifier
                        }
                    }]
            }
            : undefined), (typeof appliesToVideoFormat === 'string' && appliesToVideoFormat.length > 0)
            ? { appliesToVideoFormat }
            : undefined), (typeof appliesToMovieTicketType === 'string' && appliesToMovieTicketType.length > 0
            && typeof appliesToMovieTicketServiceOutputTypeOf === 'string' && appliesToMovieTicketServiceOutputTypeOf.length > 0)
            ? {
                appliesToMovieTicket: {
                    typeOf: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                    serviceType: appliesToMovieTicketType,
                    serviceOutput: {
                        typeOf: appliesToMovieTicketServiceOutputTypeOf
                    }
                }
            }
            : undefined), (!isNew)
            ? {
                $unset: Object.assign(Object.assign(Object.assign({}, (appliesToCategoryCode === undefined)
                    ? { appliesToCategoryCode: 1 }
                    : undefined), (appliesToVideoFormat === undefined)
                    ? { appliesToVideoFormat: 1 }
                    : undefined), (typeof appliesToMovieTicketType !== 'string' || appliesToMovieTicketType.length === 0)
                    ? { appliesToMovieTicketType: 1, appliesToMovieTicket: 1 }
                    : undefined)
            } : undefined);
    });
}
function validate() {
    return [
        express_validator_1.body('typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '価格仕様タイプ')),
        express_validator_1.body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),
        express_validator_1.body('price')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '金額'))
            .isInt()
            .withMessage(() => '数値を入力してください')
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        express_validator_1.body('appliesToCategoryCode')
            .if((_, { req }) => req.body.typeOf === sdk_1.chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用区分')),
        express_validator_1.body('appliesToMovieTicket')
            .if((_, { req }) => req.body.typeOf === sdk_1.chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用決済カード区分')),
        express_validator_1.body('appliesToVideoFormat')
            .if((_, { req }) => req.body.typeOf === sdk_1.chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用上映方式区分'))
    ];
}
exports.default = priceSpecificationsRouter;
