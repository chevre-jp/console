/**
 * アドオンルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';

import * as Message from '../../message';

import { ProductType } from '../../factory/productType';

const NUM_ADDITIONAL_PROPERTY = 10;

const addOnRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
addOnRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
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
                    product = await productService.create(product);
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
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        const searchOfferCatalogsResult = await offerCatalogService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: ProductType.Product } }
        });

        res.render('products/new', {
            message: message,
            errors: errors,
            forms: forms,
            offerCatalogs: searchOfferCatalogsResult.data
        });
    }
);

addOnRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        try {
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const searchConditions = {
                limit: limit,
                page: page,
                // sort: { 'priceSpecification.price': chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: ProductType.Product }
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
addOnRouter.all<ParamsDictionary>(
    '/:id',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
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
            }

            const forms = {
                ...product
            };

            const searchOfferCatalogsResult = await offerCatalogService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                itemOffered: { typeOf: { $eq: ProductType.Product } }
            });

            res.render('products/update', {
                message: message,
                errors: errors,
                forms: forms,
                offerCatalogs: searchOfferCatalogsResult.data
            });
        } catch (err) {
            next(err);
        }
    }
);

addOnRouter.get(
    '',
    async (__, res) => {
        res.render('products/index', {
            message: ''
        });
    }
);

function createFromBody(req: Request, isNew: boolean): any {
    let hasOfferCatalog: any;
    if (typeof req.body.hasOfferCatalog?.id === 'string' && req.body.hasOfferCatalog?.id.length > 0) {
        hasOfferCatalog = {
            typeOf: 'OfferCatalog',
            id: req.body.hasOfferCatalog?.id
        };
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: ProductType.Product,
        id: req.params.id,
        // identifier: body.identifier,
        name: req.body.name,
        ...(hasOfferCatalog !== undefined) ? { hasOfferCatalog } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(hasOfferCatalog === undefined) ? { hasOfferCatalog: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        // colName = '区分分類';
        // req.checkBody('inCodeSet.identifier').notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));

        // colName = '区分コード';
        // req.checkBody('codeValue')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName))
        //     .isAlphanumeric()
        //     .len({ max: 20 })
        //     // tslint:disable-next-line:no-magic-numbers
        //     .withMessage(Message.Common.getMaxLength(colName, 20));

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30))
    ];
}

export default addOnRouter;
