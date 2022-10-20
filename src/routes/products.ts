/**
 * プロダクトルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, Meta, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';

import * as Message from '../message';

import { ProductType, productTypes } from '../factory/productType';
import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';

const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
    ? process.env.PROJECT_CREATOR_IDS.split(',')
    : [];
const NUM_ADDITIONAL_PROPERTY = 10;

const productsRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
productsRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        const offerCatalogService = new chevre.service.OfferCatalog({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.method === 'POST') {
            // 検証
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    let product = createFromBody(req, true);

                    // メンバーシップあるいはペイメントカードの場合、createIfNotExistを有効化
                    let createIfNotExist: boolean = false;
                    if (product.typeOf === chevre.factory.product.ProductType.MembershipService
                        || product.typeOf === chevre.factory.product.ProductType.PaymentCard) {
                        createIfNotExist = req.query.createIfNotExist === 'true';
                        // createIfNotExist: falseはPROJECT_CREATOR_IDSにのみ許可
                        if (!PROJECT_CREATOR_IDS.includes(req.user.profile.sub) && !createIfNotExist) {
                            throw new chevre.factory.errors.Forbidden('multiple products forbidden');
                        }
                    }

                    if (createIfNotExist) {
                        product = <chevre.factory.product.IProduct>await productService.createIfNotExist(product);
                    } else {
                        product = <chevre.factory.product.IProduct>await productService.create(product);
                    }

                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/products/${product.id}`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            award: {},
            name: {},
            alternateName: {},
            description: {},
            priceSpecification: {
                referenceQuantity: {
                    value: 1
                },
                accounting: {}
            },
            itemOffered: { name: {} },
            typeOf: req.query.typeOf,
            ...req.body
        };
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
            } else {
                forms.serviceType = undefined;
            }

            // 通貨区分を保管
            if (typeof req.body.serviceOutputAmount === 'string' && req.body.serviceOutputAmount.length > 0) {
                forms.serviceOutputAmount = JSON.parse(req.body.serviceOutputAmount);
            } else {
                forms.serviceOutputAmount = undefined;
            }
        }

        const searchOfferCatalogsResult = await offerCatalogService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: ProductType.Product } }
        });

        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

        res.render('products/new', {
            message: message,
            errors: errors,
            forms: forms,
            offerCatalogs: searchOfferCatalogsResult.data,
            productTypes: (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0)
                ? productTypes.filter((p) => p.codeValue === req.query.typeOf)
                : productTypes,
            sellers: searchSellersResult.data
        });
    }
);

productsRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res) => {
        try {
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const offersValidFromLte = (typeof req.query.offers?.$elemMatch?.validThrough === 'string'
                && req.query.offers.$elemMatch.validThrough.length > 0)
                ? moment(`${req.query.offers.$elemMatch.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined;
            const offersValidThroughGte = (typeof req.query.offers?.$elemMatch?.validFrom === 'string'
                && req.query.offers.$elemMatch.validFrom.length > 0)
                ? moment(`${req.query.offers.$elemMatch.validFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const searchConditions: chevre.factory.product.ISearchConditions = {
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: req.query.typeOf?.$eq },
                hasOfferCatalog: {
                    id: {
                        $eq: (typeof req.query.hasOfferCatalog?.id === 'string' && req.query.hasOfferCatalog.id.length > 0)
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
                            $in: (typeof req.query.offers?.$elemMatch?.seller?.id === 'string'
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
                            $eq: (typeof req.query.serviceOutput?.amount?.currency === 'string'
                                && req.query.serviceOutput.amount.currency.length > 0)
                                ? req.query.serviceOutput.amount.currency
                                : undefined
                        }
                    }
                }
            };
            const { data } = await productService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: (<chevre.factory.product.IProduct[]>data).map((t) => {
                    return {
                        ...t,
                        hasOfferCatalogStr: (typeof t.hasOfferCatalog?.id === 'string') ? '表示' : ''
                    };
                })
            });
        } catch (err) {
            res.json({
                success: false,
                message: err.message,
                count: 0,
                results: []
            });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
productsRouter.all<ParamsDictionary>(
    '/:id',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let product = <chevre.factory.product.IProduct>await productService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        product = createFromBody(req, false);
                        await productService.update(product);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            } else if (req.method === 'DELETE') {
                try {
                    // validation
                    await preDelete(req, product);

                    await productService.deleteById({ id: req.params.id });
                    res.status(NO_CONTENT)
                        .end();
                } catch (error) {
                    res.status(BAD_REQUEST)
                        .json({ error: { message: error.message } });
                }

                return;
            }

            const forms = {
                award: {},
                ...product,
                offersValidFrom: (Array.isArray(product.offers) && product.offers.length > 0 && product.offers[0].validFrom !== undefined)
                    ? moment(product.offers[0].validFrom)
                        // .add(-1, 'day')
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : '',
                offersValidThrough: (Array.isArray(product.offers)
                    && product.offers.length > 0
                    && product.offers[0].validThrough !== undefined)
                    ? moment(product.offers[0].validThrough)
                        .add(-1, 'day')
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : '',
                ...req.body
            };

            if (req.method === 'POST') {
                // サービスタイプを保管
                if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
                    forms.serviceType = JSON.parse(req.body.serviceType);
                } else {
                    forms.serviceType = undefined;
                }

                // 通貨区分を保管
                if (typeof req.body.serviceOutputAmount === 'string' && req.body.serviceOutputAmount.length > 0) {
                    forms.serviceOutputAmount = JSON.parse(req.body.serviceOutputAmount);
                } else {
                    forms.serviceOutputAmount = undefined;
                }
            } else {
                // サービスタイプを保管
                if (typeof product.serviceType?.codeValue === 'string') {
                    if (product.typeOf === chevre.factory.product.ProductType.EventService) {
                        const searchServiceTypesResult = await categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
                            codeValue: { $eq: product.serviceType.codeValue }
                        });
                        forms.serviceType = searchServiceTypesResult.data[0];
                    } else if (product.typeOf === chevre.factory.product.ProductType.MembershipService) {
                        const searchMembershipTypesResult = await categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } },
                            codeValue: { $eq: product.serviceType.codeValue }
                        });
                        forms.serviceType = searchMembershipTypesResult.data[0];
                    } else if (product.typeOf === chevre.factory.product.ProductType.PaymentCard) {
                        const searchPaymentMethodTypesResult = await categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } },
                            codeValue: { $eq: product.serviceType.codeValue }
                        });
                        forms.serviceType = searchPaymentMethodTypesResult.data[0];
                    }
                }

                // 通貨区分を保管
                if (typeof product.serviceOutput?.amount?.currency === 'string') {
                    if (product.serviceOutput.amount.currency === chevre.factory.priceCurrency.JPY) {
                        forms.serviceOutputAmount = {
                            codeValue: product.serviceOutput.amount.currency,
                            name: { ja: product.serviceOutput.amount.currency }
                        };
                    } else {
                        const searchCurrencyTypesResult = await categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                            codeValue: { $eq: product.serviceOutput.amount.currency }
                        });
                        forms.serviceOutputAmount = searchCurrencyTypesResult.data[0];
                    }
                }
            }

            const searchOfferCatalogsResult = await offerCatalogService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                itemOffered: { typeOf: { $eq: product.typeOf } }
            });

            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

            res.render('products/update', {
                message: message,
                errors: errors,
                forms: forms,
                offerCatalogs: searchOfferCatalogsResult.data,
                productTypes: productTypes.filter((p) => p.codeValue === product.typeOf),
                sellers: searchSellersResult.data
            });
        } catch (err) {
            next(err);
        }
    }
);

export async function preDelete(req: Request, product: chevre.factory.product.IProduct) {
    // validation
    const eventService = new chevre.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const offerService = new chevre.service.Offer({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchOffersResult = await offerService.search({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        addOn: { itemOffered: { id: { $eq: product.id } } }
    });
    if (searchOffersResult.data.length > 0) {
        throw new Error('関連するオファーが存在します');
    }

    // 関連イベント検証
    const searchEventsResult = await eventService.search({
        limit: 1,
        typeOf: chevre.factory.eventType.ScreeningEvent,
        offers: { itemOffered: { id: { $in: [String(product.id)] } } },
        sort: { startDate: chevre.factory.sortType.Descending },
        endFrom: new Date()
    });
    if (searchEventsResult.data.length > 0) {
        throw new Error('終了していない関連イベントが存在します');
    }
}

productsRouter.get(
    '',
    async (req, res) => {
        // すでにtypeOfのプロダクトがあるかどうか
        let productsExist = false;
        if (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0) {
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchProductsResult = await productService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: req.query.typeOf }
            });
            productsExist = searchProductsResult.data.length > 0;
        }

        let showCreateIfNotExistButton = true;
        // メンバーシップあるいはペイメントカードの場合、プロダクト既存であれば登録ボタンを表示しない
        if (req.query.typeOf === chevre.factory.product.ProductType.MembershipService
            || req.query.typeOf === chevre.factory.product.ProductType.PaymentCard) {
            if (productsExist) {
                showCreateIfNotExistButton = false;
            }
        }

        res.render('products/index', {
            message: '',
            productTypes: (typeof req.query.typeOf === 'string')
                ? productTypes.filter((p) => p.codeValue === req.query.typeOf)
                : productTypes,
            showCreateIfNotExistButton
        });
    }
);

export function createAvailableChannelFromBody(req: Request): chevre.factory.product.IAvailableChannel {
    const serviceUrl = req.body.availableChannel?.serviceUrl;
    const siteId = req.body.availableChannel?.credentials?.siteId;
    const sitePass = req.body.availableChannel?.credentials?.sitePass;
    const authorizeServerDomain = req.body.availableChannel?.credentials?.authorizeServerDomain;
    const clientId = req.body.availableChannel?.credentials?.clientId;
    const clientSecret = req.body.availableChannel?.credentials?.clientSecret;
    const availableChannelCredentials: chevre.factory.product.ICredentials = {
        ...(typeof siteId === 'string' && siteId.length > 0) ? { siteId } : undefined,
        ...(typeof sitePass === 'string' && sitePass.length > 0) ? { sitePass } : undefined,
        ...(typeof authorizeServerDomain === 'string' && authorizeServerDomain.length > 0) ? { authorizeServerDomain } : undefined,
        ...(typeof clientId === 'string' && clientId.length > 0) ? { clientId } : undefined,
        ...(typeof clientSecret === 'string' && clientSecret.length > 0) ? { clientSecret } : undefined

    };

    const informPaymentUrl = req.body.availableChannel?.onPaymentStatusChanged?.informPayment?.recipient?.url;
    let onPaymentStatusChanged: chevre.factory.project.IOnPaymentStatusChanged | undefined;
    if (typeof informPaymentUrl === 'string' && informPaymentUrl.length > 0) {
        onPaymentStatusChanged = {
            informPayment: [
                { recipient: { url: informPaymentUrl } }
            ]
        };
    }

    return {
        typeOf: 'ServiceChannel',
        credentials: availableChannelCredentials,
        ...(typeof serviceUrl === 'string' && serviceUrl.length > 0) ? { serviceUrl } : undefined,
        // 通知設定を追加
        ...(onPaymentStatusChanged !== undefined) ? { onPaymentStatusChanged } : undefined
    };
}

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req: Request, isNew: boolean): chevre.factory.product.IProduct & chevre.service.IUnset {
    const availableChannel: chevre.factory.product.IAvailableChannel = createAvailableChannelFromBody(req);

    let hasOfferCatalog: chevre.factory.product.IHasOfferCatalog | undefined;
    if (typeof req.body.hasOfferCatalog?.id === 'string' && req.body.hasOfferCatalog?.id.length > 0) {
        hasOfferCatalog = {
            typeOf: 'OfferCatalog',
            id: req.body.hasOfferCatalog?.id
        };
    }

    let serviceOutput: chevre.factory.product.IServiceOutput | undefined;
    if (typeof req.body.serviceOutputStr === 'string' && req.body.serviceOutputStr.length > 0) {
        try {
            serviceOutput = JSON.parse(req.body.serviceOutputStr);
        } catch (error) {
            throw new Error(`invalid serviceOutput ${error.message}`);
        }
    }

    switch (req.body.typeOf) {
        case chevre.factory.product.ProductType.MembershipService:
            if (serviceOutput === undefined) {
                serviceOutput = {
                    // project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.permit.PermitType.Permit // メンバーシップの場合固定
                };
            } else {
                serviceOutput.typeOf = chevre.factory.permit.PermitType.Permit; // メンバーシップの場合固定
            }

            break;

        case chevre.factory.product.ProductType.PaymentCard:
            if (serviceOutput === undefined) {
                serviceOutput = {
                    // project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.permit.PermitType.Permit // ペイメントカードの場合固定
                };
            } else {
                serviceOutput.typeOf = chevre.factory.permit.PermitType.Permit; // ペイメントカードの場合固定
            }

            if (typeof req.body.serviceOutputAmount === 'string' && req.body.serviceOutputAmount.length > 0) {
                let serviceOutputAmount: any;
                try {
                    serviceOutputAmount = JSON.parse(req.body.serviceOutputAmount);
                } catch (error) {
                    throw new Error(`invalid serviceOutputAmount ${error.message}`);
                }

                serviceOutput.amount = { currency: serviceOutputAmount.codeValue, typeOf: 'MonetaryAmount' };
            }

            break;

        default:
            serviceOutput = undefined;
    }

    let serviceType: chevre.factory.product.IServiceType | undefined;
    if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
        try {
            serviceType = <chevre.factory.categoryCode.ICategoryCode>JSON.parse(req.body.serviceType);
            serviceType = {
                codeValue: serviceType.codeValue,
                inCodeSet: serviceType.inCodeSet,
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: 'CategoryCode'
            };
        } catch (error) {
            throw new Error(`invalid serviceOutput ${error.message}`);
        }
    }

    let offers: chevre.factory.product.IOffer[] | undefined;
    let sellerIds: string[] | string | undefined = req.body.offers?.seller?.id;
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
                    typeOf: chevre.factory.offerType.Offer,
                    priceCurrency: chevre.factory.priceCurrency.JPY,
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

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: req.body.typeOf,
        id: req.params.id,
        productID: req.body.productID,
        description: req.body.description,
        name: req.body.name,
        availableChannel,
        ...(typeof req.body.award?.ja === 'string') ? { award: req.body.award } : undefined,
        ...(hasOfferCatalog !== undefined) ? { hasOfferCatalog } : undefined,
        ...(offers !== undefined) ? { offers } : undefined,
        ...(serviceOutput !== undefined) ? { serviceOutput } : undefined,
        ...(serviceType !== undefined) ? { serviceType } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(hasOfferCatalog === undefined) ? { hasOfferCatalog: 1 } : undefined,
                    ...(offers === undefined) ? { offers: 1 } : undefined,
                    ...(serviceOutput === undefined) ? { serviceOutput: 1 } : undefined,
                    ...(serviceType === undefined) ? { serviceType: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        body('typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'プロダクトタイプ')),
        body('productID')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'プロダクトID'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 30 })
            .withMessage('3~30文字で入力してください')
            // 予約語除外
            .not()
            .isIn(RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),
        body('name.en')
            .optional()
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語名称', 30)),
        body('award.ja')
            .optional()
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 1024 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('特典', 1024)),
        body('award.en')
            .optional()
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語特典', 1024)),
        // EventServiceの場合はカタログ必須
        body('hasOfferCatalog.id')
            .if((_: any, { req }: Meta) => [
                chevre.factory.product.ProductType.EventService
            ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'カタログ')),
        body('serviceType')
            .if((_: any, { req }: Meta) => [
                chevre.factory.product.ProductType.MembershipService
            ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーシップ区分')),
        body('serviceType')
            .if((_: any, { req }: Meta) => [
                chevre.factory.product.ProductType.PaymentCard
            ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法区分')),
        body('serviceOutputAmount')
            .if((_: any, { req }: Meta) => [
                chevre.factory.product.ProductType.PaymentCard
            ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '通貨区分'))
    ];
}

export { productsRouter };
