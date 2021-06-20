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

import addOnRouter from './products/addOn';

const NUM_ADDITIONAL_PROPERTY = 10;

const productsRouter = Router();

productsRouter.use('/addOn', addOnRouter);

productsRouter.all<any>(
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

                    // プロダクトID重複確認
                    const searchProductsResult = await productService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        productID: { $eq: product.productID }
                    });
                    if (searchProductsResult.data.length > 0) {
                        throw new Error('既に存在するプロダクトIDです');
                    }

                    product = <chevre.factory.product.IProduct>await productService.create(product);
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
            // カテゴリーを保管
            if (typeof req.body.serviceOutputCategory === 'string' && req.body.serviceOutputCategory.length > 0) {
                forms.serviceOutputCategory = JSON.parse(req.body.serviceOutputCategory);
            } else {
                forms.serviceOutputCategory = undefined;
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
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
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
                // sort: { 'priceSpecification.price': chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: req.query.typeOf?.$eq },
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
                ...{
                    name: {
                        $regex: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
                    }
                }
            };
            const { data } = await productService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((t) => {
                    return {
                        ...t
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
                // カテゴリーを保管
                if (typeof req.body.serviceOutputCategory === 'string' && req.body.serviceOutputCategory.length > 0) {
                    forms.serviceOutputCategory = JSON.parse(req.body.serviceOutputCategory);
                } else {
                    forms.serviceOutputCategory = undefined;
                }
            } else {
                // カテゴリーを検索
                if (typeof product.serviceOutput?.typeOf === 'string') {
                    if (product.typeOf === chevre.factory.product.ProductType.MembershipService) {
                        const searchOfferCategoriesResult = await categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } },
                            codeValue: { $eq: product.serviceOutput.typeOf }
                        });
                        forms.serviceOutputCategory = searchOfferCategoriesResult.data[0];
                    } else if (product.typeOf === chevre.factory.product.ProductType.PaymentCard) {
                        const searchOfferCategoriesResult = await categoryCodeService.search({
                            limit: 1,
                            project: { id: { $eq: req.project.id } },
                            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } },
                            codeValue: { $eq: product.serviceOutput.typeOf }
                        });
                        forms.serviceOutputCategory = searchOfferCategoriesResult.data[0];
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

async function preDelete(req: Request, product: chevre.factory.product.IProduct) {
    // validation
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
}

productsRouter.get(
    '',
    async (req, res) => {
        res.render('products/index', {
            message: '',
            productTypes: (typeof req.query.typeOf === 'string')
                ? productTypes.filter((p) => p.codeValue === req.query.typeOf)
                : productTypes
        });
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(req: Request, isNew: boolean): chevre.factory.product.IProduct {
    let hasOfferCatalog: any;
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
        case chevre.factory.product.ProductType.PaymentCard:
            let serviceOutputCategory: any;
            try {
                serviceOutputCategory = JSON.parse(req.body.serviceOutputCategory);
            } catch (error) {
                throw new Error(`invalid serviceOutputCategory ${error.message}`);
            }

            if (serviceOutput === undefined) {
                serviceOutput = {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: serviceOutputCategory.codeValue
                };
            } else {
                serviceOutput.typeOf = serviceOutputCategory.codeValue;
            }

            break;

        default:
            serviceOutput = undefined;
    }

    let offers: chevre.factory.offer.IOffer[] | undefined;
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

    if (typeof req.body.offersStr === 'string' && req.body.offersStr.length > 0) {
        // try {
        //     offers = JSON.parse(req.body.offersStr);
        //     if (!Array.isArray(offers)) {
        //         throw Error('offers must be an array');
        //     }
        // } catch (error) {
        //     throw new Error(`invalid offers ${error.message}`);
        // }
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: req.body.typeOf,
        id: req.params.id,
        productID: req.body.productID,
        name: req.body.name,
        ...(hasOfferCatalog !== undefined) ? { hasOfferCatalog } : undefined,
        ...(offers !== undefined) ? { offers } : undefined,
        ...(serviceOutput !== undefined) ? { serviceOutput } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(hasOfferCatalog === undefined) ? { hasOfferCatalog: 1 } : undefined,
                    ...(offers === undefined) ? { offers: 1 } : undefined,
                    ...(serviceOutput === undefined) ? { serviceOutput: 1 } : undefined
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
            // tslint:disable-next-line:no-magic-numbers
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('プロダクトID', 30)),

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

        body('serviceOutputCategory')
            .if((_: any, { req }: Meta) => [
                chevre.factory.product.ProductType.MembershipService
            ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーシップ区分')),

        body('serviceOutputCategory')
            .if((_: any, { req }: Meta) => [
                chevre.factory.product.ProductType.PaymentCard
            ].includes(req.body.typeOf))
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法区分'))

    ];
}

export default productsRouter;
