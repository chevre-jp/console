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
 * カテゴリーコードルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const categoryCodeSet_1 = require("../factory/categoryCodeSet");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const NUM_ADDITIONAL_PROPERTY = 10;
const categoryCodesRouter = express_1.Router();
categoryCodesRouter.get('/([\$])image([\$])', (__, res) => {
    res.status(http_status_1.NO_CONTENT)
        .end();
});
categoryCodesRouter.get('/image', (req, res) => {
    if (typeof req.query.url === 'string' && req.query.url.length > 0) {
        res.redirect(req.query.url);
    }
    else {
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
});
categoryCodesRouter.get('', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('categoryCodes/index', {
        message: '',
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier,
        categoryCodeSets: categoryCodeSet_1.categoryCodeSets
    });
}));
categoryCodesRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield categoryCodeService.search({
            limit: limit,
            page: page,
            sort: { codeValue: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            inCodeSet: {
                identifier: {
                    $eq: (typeof ((_a = req.query.inCodeSet) === null || _a === void 0 ? void 0 : _a.identifier) === 'string' && req.query.inCodeSet.identifier.length > 0)
                        ? req.query.inCodeSet.identifier
                        : undefined,
                    $in: (Array.isArray((_c = (_b = req.query.inCodeSet) === null || _b === void 0 ? void 0 : _b.identifier) === null || _c === void 0 ? void 0 : _c.$in))
                        ? (_d = req.query.inCodeSet) === null || _d === void 0 ? void 0 : _d.identifier.$in : undefined
                }
            },
            codeValue: {
                $eq: (typeof ((_e = req.query.codeValue) === null || _e === void 0 ? void 0 : _e.$eq) === 'string' && req.query.codeValue.$eq.length > 0)
                    ? req.query.codeValue.$eq
                    : undefined
            },
            name: {
                $regex: (typeof ((_f = req.query.name) === null || _f === void 0 ? void 0 : _f.$regex) === 'string' && req.query.name.$regex.length > 0)
                    ? req.query.name.$regex
                    : undefined
            },
            paymentMethod: {
                typeOf: {
                    $eq: (typeof ((_g = req.query.paymentMethod) === null || _g === void 0 ? void 0 : _g.typeOf) === 'string' && req.query.paymentMethod.typeOf.length > 0)
                        ? req.query.paymentMethod.typeOf
                        : undefined
                }
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((d) => {
                const categoryCodeSet = categoryCodeSet_1.categoryCodeSets.find((c) => c.identifier === d.inCodeSet.identifier);
                return Object.assign(Object.assign({}, d), { categoryCodeSetName: categoryCodeSet === null || categoryCodeSet === void 0 ? void 0 : categoryCodeSet.name });
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
categoryCodesRouter.all('/new', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
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
                let categoryCode = createCategoryCodeFromBody(req, true);
                // コード重複確認
                switch (categoryCode.inCodeSet.identifier) {
                    // 決済カード区分については、同セット内でユニーク
                    case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType:
                        const { data } = yield categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            codeValue: { $eq: categoryCode.codeValue },
                            inCodeSet: { identifier: { $eq: categoryCode.inCodeSet.identifier } }
                        });
                        if (data.length > 0) {
                            throw new Error('既に存在するコードです');
                        }
                        break;
                    // その他はグローバルユニークを考慮
                    default:
                        const searchCategoryCodesGloballyResult = yield categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            codeValue: { $eq: categoryCode.codeValue }
                            // inCodeSet: {
                            //     identifier: {
                            //         $in: [
                            //             chevre.factory.categoryCode.CategorySetIdentifier.MembershipType,
                            //             chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType,
                            //             chevre.factory.categoryCode.CategorySetIdentifier.ServiceType
                            //         ]
                            //     }
                            // }
                        });
                        if (searchCategoryCodesGloballyResult.data.length > 0) {
                            throw new Error('既に存在するコードです');
                        }
                }
                categoryCode = yield categoryCodeService.create(categoryCode);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/categoryCodes/${categoryCode.id}/update`);
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
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchProductsResult = yield productService.search({
        project: { id: { $eq: req.project.id } },
        typeOf: {
            $in: [
                sdk_1.chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
            ]
        }
    });
    if (req.method === 'POST') {
        // レイティングを保管
        if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
            forms.inCodeSet = JSON.parse(req.body.inCodeSet);
        }
        else {
            forms.inCodeSet = undefined;
        }
    }
    res.render('categoryCodes/new', {
        message: message,
        errors: errors,
        forms: forms,
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier,
        categoryCodeSets: categoryCodeSet_1.categoryCodeSets,
        paymentServices: searchProductsResult.data
    });
}));
categoryCodesRouter.get('/:id/image', (__, res) => {
    res.status(http_status_1.NO_CONTENT)
        .end();
});
// tslint:disable-next-line:use-default-type-parameter
categoryCodesRouter.all('/:id/update', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    let categoryCode = yield categoryCodeService.findById({
        id: req.params.id
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            // コンテンツDB登録
            try {
                categoryCode = Object.assign(Object.assign({}, createCategoryCodeFromBody(req, false)), { id: categoryCode.id });
                yield categoryCodeService.update(categoryCode);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign(Object.assign({ additionalProperty: [] }, categoryCode), {
        inCodeSet: categoryCodeSet_1.categoryCodeSets.find((s) => s.identifier === categoryCode.inCodeSet.identifier)
    }), req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    const productService = new sdk_1.chevre.service.Product({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchProductsResult = yield productService.search({
        project: { id: { $eq: req.project.id } },
        typeOf: {
            $in: [
                sdk_1.chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
            ]
        }
    });
    if (req.method === 'POST') {
        // レイティングを保管
        if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
            forms.inCodeSet = JSON.parse(req.body.inCodeSet);
        }
        else {
            forms.inCodeSet = undefined;
        }
    }
    res.render('categoryCodes/update', {
        message: message,
        errors: errors,
        forms: forms,
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier,
        categoryCodeSets: categoryCodeSet_1.categoryCodeSets,
        paymentServices: searchProductsResult.data
    });
}));
categoryCodesRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const eventService = new chevre.service.Event({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient
        // });
        const categoryCodeService = new sdk_1.chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCode = yield categoryCodeService.findById({ id: req.params.id });
        yield preDelete(req, categoryCode);
        yield categoryCodeService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function preDelete(req, categoryCode) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        // validation
        const creativeWorkService = new sdk_1.chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
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
        const offerCatalogService = new sdk_1.chevre.service.OfferCatalog({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const priceSpecificationService = new sdk_1.chevre.service.PriceSpecification({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // 関連する価格仕様
        const searchPriceSpecificationsResult = yield priceSpecificationService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            appliesToCategoryCode: {
                $elemMatch: {
                    codeValue: { $eq: categoryCode.codeValue },
                    'inCodeSet.identifier': { $eq: categoryCode.inCodeSet.identifier }
                }
            }
        });
        if (searchPriceSpecificationsResult.data.length > 0) {
            throw new Error('関連する価格仕様が存在します');
        }
        switch (categoryCode.inCodeSet.identifier) {
            // メンバーシップ区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MembershipType:
                const searchProductsResult = yield productService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    serviceOutput: { typeOf: { $eq: categoryCode.codeValue } }
                });
                if (searchProductsResult.data.length > 0) {
                    throw new Error('関連するプロダクトが存在します');
                }
                const searchOffersResult4membershipType = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    eligibleMembershipType: { codeValue: { $eq: categoryCode.codeValue } }
                });
                if (searchOffersResult4membershipType.data.length > 0) {
                    throw new Error('関連するオファーが存在します');
                }
                break;
            // 通貨区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType:
                const searchProductsResult4currencyType = yield productService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    serviceOutput: { amount: { currency: { $eq: categoryCode.codeValue } } }
                });
                if (searchProductsResult4currencyType.data.length > 0) {
                    throw new Error('関連するプロダクトが存在します');
                }
                const searchOffersResult4currencyType = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    eligibleMonetaryAmount: { currency: { $eq: categoryCode.codeValue } }
                });
                if (searchOffersResult4currencyType.data.length > 0) {
                    throw new Error('関連するオファーが存在します');
                }
                break;
            // レイティング区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType:
                const searchMoviesResult4contentRating = yield creativeWorkService.searchMovies({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    contentRating: { $eq: categoryCode.codeValue }
                });
                if (searchMoviesResult4contentRating.data.length > 0) {
                    throw new Error('関連するコンテンツが存在します');
                }
                break;
            // 配給区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.DistributorType:
                const searchMoviesResult4distributorType = yield creativeWorkService.searchMovies({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    distributor: { codeValue: { $eq: categoryCode.codeValue } }
                });
                if (searchMoviesResult4distributorType.data.length > 0) {
                    throw new Error('関連するコンテンツが存在します');
                }
                break;
            // 決済カード(ムビチケ券種)区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType:
                const searchOffersResult4movieTicketType = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    priceSpecification: {
                        appliesToMovieTicket: {
                            serviceType: { $eq: categoryCode.codeValue },
                            serviceOutput: { typeOf: { $eq: (_a = categoryCode.paymentMethod) === null || _a === void 0 ? void 0 : _a.typeOf } }
                        }
                    }
                });
                if (searchOffersResult4movieTicketType.data.length > 0) {
                    throw new Error('関連するオファーが存在します');
                }
                break;
            // オファーカテゴリー区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType:
                const searchOffersResult = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    category: { codeValue: { $in: [categoryCode.codeValue] } }
                });
                if (searchOffersResult.data.length > 0) {
                    throw new Error('関連するオファーが存在します');
                }
                break;
            // 決済方法区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType:
                const searchProductsResult4paymentMethodType = yield productService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    serviceOutput: { typeOf: { $eq: categoryCode.codeValue } }
                });
                if (searchProductsResult4paymentMethodType.data.length > 0) {
                    throw new Error('関連するプロダクトが存在します');
                }
                break;
            // 座席区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType:
                const searchSeatsResult = yield placeService.searchSeats({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    seatingType: { $eq: categoryCode.codeValue }
                });
                if (searchSeatsResult.data.length > 0) {
                    throw new Error('関連する座席が存在します');
                }
                const searchOffersResult4seatingType = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    eligibleSeatingType: {
                        codeValue: { $eq: categoryCode.codeValue }
                    }
                });
                if (searchOffersResult4seatingType.data.length > 0) {
                    throw new Error('関連するオファーが存在します');
                }
                break;
            // サービス区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType:
                const searchOfferCatalogsResult = yield offerCatalogService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    itemOffered: { serviceType: { codeValue: { $eq: categoryCode.codeValue } } }
                });
                if (searchOfferCatalogsResult.data.length > 0) {
                    throw new Error('関連するオファーカタログが存在します');
                }
                break;
            // 音響方式区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType:
                // 関連する施設コンテンツ
                const searchEventsResult4soundFormatType = yield eventService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
                    soundFormat: { typeOf: { $eq: categoryCode.codeValue } }
                });
                if (searchEventsResult4soundFormatType.data.length > 0) {
                    throw new Error('関連する施設コンテンツが存在します');
                }
                break;
            // 上映方式区分
            case sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType:
                // 関連する施設コンテンツ
                const searchEventsResult4videoFormatType = yield eventService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
                    videoFormat: { typeOf: { $eq: categoryCode.codeValue } }
                });
                if (searchEventsResult4videoFormatType.data.length > 0) {
                    throw new Error('関連する施設コンテンツが存在します');
                }
                break;
            default:
        }
    });
}
function createCategoryCodeFromBody(req, isNew) {
    var _a, _b;
    const paymentMethodType = (_a = req.body.paymentMethod) === null || _a === void 0 ? void 0 : _a.typeOf;
    const image = (typeof req.body.image === 'string' && req.body.image.length > 0)
        ? req.body.image
        : undefined;
    const color = (typeof req.body.color === 'string' && req.body.color.length > 0)
        ? req.body.color
        : undefined;
    const inCodeSet = JSON.parse(req.body.inCodeSet);
    const nameEn = (_b = req.body.name) === null || _b === void 0 ? void 0 : _b.en;
    return Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: 'CategoryCode', codeValue: req.body.codeValue, inCodeSet: {
            typeOf: 'CategoryCodeSet',
            identifier: inCodeSet.identifier
        }, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined, name: Object.assign({ ja: req.body.name.ja }, (typeof nameEn === 'string' && nameEn.length > 0) ? { en: nameEn } : undefined) }, (inCodeSet.identifier === sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType)
        ? {
            paymentMethod: {
                typeOf: (typeof paymentMethodType === 'string' && paymentMethodType.length > 0)
                    ? paymentMethodType
                    // デフォルトはとりあえず固定でムビチケ
                    : sdk_1.chevre.factory.paymentMethodType.MovieTicket
            }
        }
        : undefined), (typeof image === 'string') ? { image } : undefined), (typeof color === 'string') ? { color } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign({}, (typeof image !== 'string') ? { image: 1 } : undefined), (typeof color !== 'string') ? { color: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('inCodeSet')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '区分分類')),
        express_validator_1.body('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            // .isAlphanumeric()
            .matches(/^[0-9a-zA-Z\+]+$/)
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
        express_validator_1.body('paymentMethod.typeOf')
            .if((_, { req }) => {
            let inCodeSet;
            try {
                inCodeSet = JSON.parse(String(req.body.inCodeSet));
            }
            catch (error) {
                // no op
            }
            return (inCodeSet === null || inCodeSet === void 0 ? void 0 : inCodeSet.identifier) === sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType;
        })
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法'))
    ];
}
exports.default = categoryCodesRouter;
