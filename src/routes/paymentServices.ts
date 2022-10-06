/**
 * 決済サービスルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { paymentServiceTypes } from '../factory/paymentServiceType';

import { createAvailableChannelFromBody } from './products';

const NUM_ADDITIONAL_PROPERTY = 10;
const NUM_PROVIDER = 20;

const paymentServicesRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
paymentServicesRouter.all<ParamsDictionary>(
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

        if (req.method === 'POST') {
            // 検証
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    let product = createFromBody(req, true);

                    product = <chevre.factory.service.paymentService.IService>await productService.create(product);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/paymentServices/${product.id}`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            provider: [],
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

        if (forms.provider.length < NUM_PROVIDER) {
            // tslint:disable-next-line:prefer-array-literal
            forms.provider.push(...[...Array(NUM_PROVIDER - forms.provider.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // プロバイダーを保管
            if (Array.isArray(forms.provider)) {
                (<any[]>forms.provider).forEach((provider, key) => {
                    if (typeof provider.seller === 'string' && provider.seller.length > 0) {
                        forms.provider[key] = {
                            ...JSON.parse(provider.seller),
                            ...provider
                        };
                    } else {
                        forms.provider[key] = {};
                    }
                });
            }

            // 決済方法区分を保管
            if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
                forms.paymentMethodType = JSON.parse(req.body.paymentMethodType);
            } else {
                forms.paymentMethodType = undefined;
            }
        }

        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

        res.render('paymentServices/new', {
            message: message,
            errors: errors,
            forms: forms,
            paymentServiceTypes: paymentServiceTypes,
            sellers: searchSellersResult.data
        });
    }
);

paymentServicesRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res) => {
        try {
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const searchConditions: chevre.factory.product.ISearchConditions = {
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                typeOf: (typeof req.query.typeOf?.$eq === 'string' && req.query.typeOf.$eq.length > 0)
                    ? { $eq: req.query.typeOf.$eq }
                    : {
                        $in: [
                            chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                            chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                        ]
                    },
                serviceType: {
                    codeValue: {
                        $eq: (typeof req.query.paymentMethodType === 'string' && req.query.paymentMethodType.length > 0)
                            ? req.query.paymentMethodType
                            : undefined
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
paymentServicesRouter.all<ParamsDictionary>(
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

            let product = await productService.findById({ id: req.params.id });

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
                await productService.deleteById({ id: req.params.id });
                res.status(NO_CONTENT)
                    .end();

                return;
            }

            const forms = {
                additionalProperty: [],
                provider: [],
                ...product,
                ...req.body
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }
            if (forms.provider.length < NUM_PROVIDER) {
                // tslint:disable-next-line:prefer-array-literal
                forms.provider.push(...[...Array(NUM_PROVIDER - forms.provider.length)].map(() => {
                    return {};
                }));
            }

            if (req.method === 'POST') {
                // プロバイダーを保管
                if (Array.isArray(forms.provider)) {
                    (<any[]>forms.provider).forEach((provider, key) => {
                        if (typeof provider.seller === 'string' && provider.seller.length > 0) {
                            forms.provider[key] = {
                                ...JSON.parse(provider.seller),
                                ...provider
                            };
                        } else {
                            forms.provider[key] = {};
                        }
                    });
                }

                // 決済方法区分を保管
                if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
                    forms.paymentMethodType = JSON.parse(req.body.paymentMethodType);
                } else {
                    forms.paymentMethodType = undefined;
                }
            } else {
                // 決済方法区分を保管
                if (typeof product.serviceType?.codeValue === 'string') {
                    const searchPaymentMethodTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } },
                        codeValue: { $eq: product.serviceType.codeValue }
                    });
                    forms.paymentMethodType = searchPaymentMethodTypesResult.data[0];
                }
            }

            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

            res.render('paymentServices/update', {
                message: message,
                errors: errors,
                forms: forms,
                paymentServiceTypes: paymentServiceTypes,
                sellers: searchSellersResult.data
            });
        } catch (err) {
            next(err);
        }
    }
);

paymentServicesRouter.get(
    '',
    async (req, res) => {
        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

        res.render('paymentServices/index', {
            message: '',
            paymentServiceTypes: paymentServiceTypes,
            sellers: searchSellersResult.data
        });
    }
);

function createFromBody(req: Request, isNew: boolean): chevre.factory.service.paymentService.IService & chevre.service.IUnset {
    const availableChannel: chevre.factory.product.IAvailableChannel = createAvailableChannelFromBody(req);

    let serviceTypeCodeValue: string | undefined;
    if (typeof req.body.paymentMethodType === 'string' && req.body.paymentMethodType.length > 0) {
        try {
            const paymentMethodTypeCategoryCode = <chevre.factory.categoryCode.ICategoryCode>JSON.parse(req.body.paymentMethodType);
            serviceTypeCodeValue = paymentMethodTypeCategoryCode.codeValue;
        } catch (error) {
            throw new Error(`invalid paymentMethodType ${error.message}`);
        }
    }

    let serviceType: chevre.factory.product.IServiceType | undefined;
    if (serviceTypeCodeValue !== undefined) {
        serviceType = {
            codeValue: serviceTypeCodeValue,
            inCodeSet: { typeOf: 'CategoryCodeSet', identifier: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType },
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: 'CategoryCode'
        };
    }

    let provider: chevre.factory.service.paymentService.IProvider[] = [];
    if (Array.isArray(req.body.provider)) {
        provider = (<any[]>req.body.provider).filter((p) => typeof p.seller === 'string' && p.seller.length > 0)
            .map((p) => {
                const selectedSeller = JSON.parse(p.seller);

                const credentials: chevre.factory.service.paymentService.IProviderCredentials = {
                    ...(typeof p.credentials?.shopId === 'string' && p.credentials.shopId.length > 0)
                        ? { shopId: <string>p.credentials.shopId }
                        : undefined,
                    ...(typeof p.credentials?.shopPass === 'string' && p.credentials.shopPass.length > 0)
                        ? { shopPass: <string>p.credentials.shopPass }
                        : undefined,
                    ...(typeof p.credentials?.tokenizationCode === 'string' && p.credentials.tokenizationCode.length > 0)
                        ? { tokenizationCode: <string>p.credentials.tokenizationCode }
                        : undefined,
                    ...(typeof p.credentials?.paymentUrlExpiresInSeconds === 'string'
                        && p.credentials.paymentUrlExpiresInSeconds.length > 0)
                        ? { paymentUrlExpiresInSeconds: Number(p.credentials.paymentUrlExpiresInSeconds) }
                        : undefined,
                    ...(typeof p.credentials?.kgygishCd === 'string' && p.credentials.kgygishCd.length > 0)
                        ? { kgygishCd: <string>p.credentials.kgygishCd }
                        : undefined,
                    ...(typeof p.credentials?.stCd === 'string' && p.credentials.stCd.length > 0)
                        ? { stCd: <string>p.credentials.stCd }
                        : undefined
                };

                return {
                    typeOf: selectedSeller.typeOf,
                    id: String(selectedSeller.id),
                    name: selectedSeller.name,
                    credentials
                };
            });
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: req.body.typeOf,
        id: req.params.id,
        productID: req.body.productID,
        description: req.body.description,
        name: req.body.name,
        provider,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? (<any[]>req.body.additionalProperty).filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        availableChannel,
        ...(serviceType !== undefined) ? { serviceType } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    // 仕様変更でserviceOutputは不要になったので
                    ...{ serviceOutput: 1 },
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

        body('paymentMethodType')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法区分'))
    ];
}

export { paymentServicesRouter };
