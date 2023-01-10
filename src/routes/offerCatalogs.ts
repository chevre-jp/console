/**
 * オファーカタログルーター
 */
import { chevre, factory } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { ProductType, productTypes } from '../factory/productType';
import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';
import { preDelete as preDeleteProduct } from './products';

import { validateCsrfToken } from '../middlewares/validateCsrfToken';

const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_NAME_JA: number = 64;
const DEFAULT_MAX_NUM_OFFER = 100;
// tslint:disable-next-line:no-magic-numbers
const NEW_MAX_NUM_OFFER: number = (typeof process.env.NEW_MAX_NUM_OFFER === 'string') ? Number(process.env.NEW_MAX_NUM_OFFER) : 100;
const ADDITIONAL_PROPERTY_NAME_VALIDATION_EXCEPTIONS: string[] = [
    'イベントワクワク割対象作品：詳細・・・・'
];

const offerCatalogsRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
offerCatalogsRouter.all<ParamsDictionary>(
    '/add',
    validateCsrfToken,
    ...validate(true),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            const chevreProject = await projectService.findById({ id: req.project.id });
            const useEventServiceAsProduct: boolean = chevreProject.subscription?.useEventServiceAsProduct === true;

            let message = '';
            let errors: any = {};
            let csrfToken: string | undefined;

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        req.body.id = '';
                        const { offerCatalogFromBody, serviceTypeFromBody } = await createFromBody(req, useEventServiceAsProduct);

                        const offerCatalog = await offerCatalogService.create(offerCatalogFromBody);

                        if (!useEventServiceAsProduct) {
                            // EventServiceプロダクトも作成
                            await upsertEventService(offerCatalog, serviceTypeFromBody)({ product: productService });
                        }

                        // tslint:disable-next-line:no-dynamic-delete
                        delete (<Express.Session>req.session).csrfSecret;
                        req.flash('message', '登録しました');
                        res.redirect(`/projects/${req.project.id}/offerCatalogs/${offerCatalog.id}/update`);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            } else {
                const tokens = new Tokens();
                const csrfSecret = await tokens.secret();
                csrfToken = tokens.create(csrfSecret);
                (<Express.Session>req.session).csrfSecret = {
                    value: csrfSecret,
                    createDate: new Date()
                };
            }

            const forms = {
                additionalProperty: [],
                id: (typeof req.body.id !== 'string' || req.body.id.length === 0) ? '' : req.body.id,
                name: (req.body.name === undefined || req.body.name === null) ? {} : req.body.name,
                description: (req.body.description === undefined || req.body.description === null) ? {} : req.body.description,
                alternateName: (req.body.alternateName === undefined || req.body.alternateName === null) ? {} : req.body.alternateName,
                ...(typeof csrfToken === 'string') ? { csrfToken } : undefined,
                ...req.body
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }

            let originalOfferCatalog: factory.offerCatalog.IOfferCatalog | undefined;
            if (req.method === 'POST') {
                // no op
            } else {
                // 既存カタログからの複製の場合
                const duplicateFrom = req.query.duplicateFrom;
                if (typeof duplicateFrom === 'string' && duplicateFrom.length > 0) {
                    originalOfferCatalog = await offerCatalogService.findById({ id: duplicateFrom });
                    forms.itemListElement = originalOfferCatalog.itemListElement;
                    forms.itemOffered = originalOfferCatalog.itemOffered;
                    forms.name = createCopiedString(originalOfferCatalog.name);
                }
            }

            // オファー検索
            let offers: chevre.factory.unitPriceOffer.IUnitPriceOffer[] = [];
            if (Array.isArray(forms.itemListElement) && forms.itemListElement.length > 0) {
                const itemListElementIds = (<any[]>forms.itemListElement).map((element) => element.id);

                // カタログのアイテムリスト上限数への依存を排除(2022-11-08~)
                const limit = 100;
                let page = 0;
                let numData: number = limit;
                while (numData === limit) {
                    page += 1;
                    const searchOffersResult = await offerService.search({
                        limit,
                        page,
                        project: { id: { $eq: req.project.id } },
                        id: { $in: itemListElementIds }
                    });
                    numData = searchOffersResult.data.length;
                    offers.push(...searchOffersResult.data);
                }

                // 登録順にソート
                offers = offers.sort(
                    (a, b) => itemListElementIds.indexOf(a.id) - itemListElementIds.indexOf(b.id)
                );
            }

            const searchServiceTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } }
            });

            res.render('offerCatalogs/add', {
                message: message,
                errors: errors,
                forms: forms,
                serviceTypes: searchServiceTypesResult.data,
                offers: offers,
                productTypes: productTypes,
                originalOfferCatalog,
                useEventServiceAsProduct
            });
        } catch (error) {
            next(error);
        }
    }
);

const SUFFIX_COPIED_STRING = ' - コピー';
function createCopiedString(params: string | factory.multilingualString) {
    return (typeof params === 'string')
        ? `${params}${SUFFIX_COPIED_STRING}`
        : {
            en: (typeof params.en === 'string') ? `${params.en}${SUFFIX_COPIED_STRING}` : '',
            ja: (typeof params.ja === 'string') ? `${params.ja}${SUFFIX_COPIED_STRING}` : ''
        };
}

// tslint:disable-next-line:use-default-type-parameter
offerCatalogsRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(false),
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
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
            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            const searchServiceTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } }
            });

            const chevreProject = await projectService.findById({ id: req.project.id });
            const useEventServiceAsProduct: boolean = chevreProject.subscription?.useEventServiceAsProduct === true;

            const offerCatalog = await offerCatalogService.findById({ id: req.params.id });

            let eventServiceProduct: factory.product.IProduct | undefined;
            if (!useEventServiceAsProduct) {
                const searchEventServicesResult = await productService.search({
                    limit: 1,
                    typeOf: { $eq: chevre.factory.product.ProductType.EventService },
                    productID: { $eq: `${chevre.factory.product.ProductType.EventService}${offerCatalog.id}` }
                });
                eventServiceProduct = <factory.product.IProduct | undefined>searchEventServicesResult.data.shift();
                if (eventServiceProduct === undefined) {
                    throw new Error('興行が見つかりません');
                }
            }

            let message = '';
            let errors: any = {};
            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        // DB登録
                        req.body.id = req.params.id;
                        const { offerCatalogFromBody, serviceTypeFromBody } = await createFromBody(req, useEventServiceAsProduct);
                        await offerCatalogService.update(offerCatalogFromBody);

                        if (!useEventServiceAsProduct) {
                            // EventServiceプロダクトも編集(なければ作成)
                            await upsertEventService(offerCatalogFromBody, serviceTypeFromBody)({ product: productService });
                        }

                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                additionalProperty: [],
                ...offerCatalog,
                serviceType: eventServiceProduct?.serviceType?.codeValue,
                ...req.body
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }

            // オファー検索
            let offers: chevre.factory.unitPriceOffer.IUnitPriceOffer[] = [];
            if (Array.isArray(forms.itemListElement) && forms.itemListElement.length > 0) {
                const itemListElementIds = (<any[]>forms.itemListElement).map((element) => element.id);

                // カタログのアイテムリスト上限数への依存を排除(2022-11-08~)
                const limit = 100;
                let page = 0;
                let numData: number = limit;
                while (numData === limit) {
                    page += 1;
                    const searchOffersResult = await offerService.search({
                        limit,
                        page,
                        project: { id: { $eq: req.project.id } },
                        id: { $in: itemListElementIds }
                    });
                    numData = searchOffersResult.data.length;
                    offers.push(...searchOffersResult.data);
                }

                // 登録順にソート
                offers = offers.sort(
                    (a, b) => itemListElementIds.indexOf(a.id) - itemListElementIds.indexOf(b.id)
                );
            }

            res.render('offerCatalogs/update', {
                message: message,
                errors: errors,
                offers: offers,
                forms: forms,
                serviceTypes: searchServiceTypesResult.data,
                productTypes: productTypes,
                useEventServiceAsProduct
            });
        } catch (error) {
            next(error);
        }
    }
);

function upsertEventService(
    offerCatalog: chevre.factory.offerCatalog.IOfferCatalog,
    serviceType?: chevre.factory.offerCatalog.IServiceType | undefined
) {
    return async (repos: {
        product: chevre.service.Product;
    }) => {
        // EventServiceでなければ何もしない
        if (offerCatalog.itemOffered.typeOf !== chevre.factory.product.ProductType.EventService) {
            return;
        }

        const eventService = offerCatalog2eventService(offerCatalog, serviceType);
        const searchProductsResult = await repos.product.search({
            limit: 1,
            typeOf: { $eq: factory.product.ProductType.EventService },
            productID: { $eq: eventService.productID }
        });
        const existingProduct = searchProductsResult.data.shift();
        if (existingProduct === undefined) {
            await repos.product.create(eventService);
        } else {
            await repos.product.update({ ...eventService, id: existingProduct.id });
        }
    };
}

offerCatalogsRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const offerCatalog = await offerCatalogService.findById({ id: req.params.id });

            // 削除して問題ないカタログかどうか検証
            await preDelete(req, offerCatalog);

            await offerCatalogService.deleteById({ id: req.params.id });
            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(req: Request, offerCatalog: chevre.factory.offerCatalog.IOfferCatalog) {
    // const eventService = new chevre.service.Event({
    //     endpoint: <string>process.env.API_ENDPOINT,
    //     auth: req.user.authClient,
    //     project: { id: req.project.id }
    // });
    const productService = new chevre.service.Product({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const projectService = new chevre.service.Project({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: '' }
    });

    const chevreProject = await projectService.findById({ id: req.project.id });
    const useEventServiceAsProduct: boolean = chevreProject.subscription?.useEventServiceAsProduct === true;

    // プロダクト確認
    if (offerCatalog.itemOffered.typeOf === chevre.factory.product.ProductType.EventService) {
        if (!useEventServiceAsProduct) {
            // プロダクトのpreDelete後にEventServiceも削除
            const searchEventServicesResult = await productService.search({
                limit: 1,
                typeOf: { $eq: factory.product.ProductType.EventService },
                productID: { $eq: `${factory.product.ProductType.EventService}${offerCatalog.id}` }
            });
            const existingEventService = <factory.product.IProduct | undefined>searchEventServicesResult.data.shift();
            if (existingEventService !== undefined) {
                await preDeleteProduct(req, existingEventService);
                await productService.deleteById({ id: String(existingEventService.id) });
            }
        }
    }
    const searchProductsResult = await productService.search({
        limit: 1,
        hasOfferCatalog: { id: { $eq: offerCatalog.id } }
    });
    if (searchProductsResult.data.length > 0) {
        throw new Error('関連するプロダクトが存在します');
    }

    // イベント確認
    // const searchEventsResult = await eventService.search({
    //     limit: 1,
    //     typeOf: chevre.factory.eventType.ScreeningEvent,
    //     project: { id: { $eq: req.project.id } },
    //     hasOfferCatalog: { id: { $eq: offerCatalog.id } },
    //     sort: { startDate: chevre.factory.sortType.Descending },
    //     endFrom: new Date()
    // });
    // if (searchEventsResult.data.length > 0) {
    //     throw new Error('終了していないスケジュールが存在します');
    // }

    switch (offerCatalog.itemOffered.typeOf) {
        case ProductType.MembershipService:
        case ProductType.PaymentCard:
        case ProductType.Product:
            break;

        case ProductType.EventService:
        case ProductType.Transportation:

            break;

        default:
    }
}

offerCatalogsRouter.get(
    '/:id/offers',
    async (req, res) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const offerCatalog = await offerCatalogService.findById({ id: req.params.id });
            const offerIds = offerCatalog.itemListElement.map((element) => element.id);

            let offers: chevre.factory.unitPriceOffer.IUnitPriceOffer[] = [];

            if (offerIds.length > 0) {
                // カタログのアイテムリスト上限数への依存を排除(2022-11-08~)
                const limit = 100;
                let page = 0;
                let numData: number = limit;
                while (numData === limit) {
                    page += 1;
                    const searchOffersResult = await offerService.search({
                        limit,
                        page,
                        project: { id: { $eq: req.project.id } },
                        id: { $in: offerIds }
                    });
                    numData = searchOffersResult.data.length;
                    offers.push(...searchOffersResult.data);
                }

                // 登録順にソート
                offers = offers.sort(
                    (a, b) => offerIds.indexOf(<string>a.id) - offerIds.indexOf(<string>b.id)
                );
            }

            res.json({
                success: true,
                count: offers.length,
                results: offers
            });
        } catch (err) {
            res.json({
                success: false,
                results: err
            });
        }
    }
);

offerCatalogsRouter.get(
    '',
    async (req, res) => {
        const projectService = new chevre.service.Project({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });

        const chevreProject = await projectService.findById({ id: req.project.id });
        const useEventServiceAsProduct: boolean = chevreProject.subscription?.useEventServiceAsProduct === true;

        res.render('offerCatalogs/index', {
            message: '',
            productTypes: productTypes,
            useEventServiceAsProduct
        });
    }
);

offerCatalogsRouter.get(
    '/getlist',
    async (req, res) => {
        try {
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
            const { data } = await offerCatalogService.search({
                limit: limit,
                page: page,
                sort: { identifier: chevre.factory.sortType.Ascending },
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
                    typeOf: {
                        $eq: (typeof req.query.itemOffered?.typeOf?.$eq === 'string' && req.query.itemOffered?.typeOf?.$eq.length > 0)
                            ? req.query.itemOffered?.typeOf?.$eq
                            : undefined
                    }
                },
                additionalProperty: {
                    ...(typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                        ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
                        : undefined
                }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((catalog) => {
                    const productType = productTypes.find((p) => p.codeValue === catalog.itemOffered.typeOf);

                    const additionalPropertyMatched =
                        (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                            ? catalog.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                            : undefined;

                    return {
                        ...catalog,
                        ...(productType !== undefined) ? { itemOfferedName: productType.name } : undefined,
                        offerCount: (Array.isArray(catalog.itemListElement)) ? catalog.itemListElement.length : 0,
                        ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
                    };
                })
            });
        } catch (err) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

offerCatalogsRouter.get(
    '/searchOffersByPrice',
    async (req, res) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let data: chevre.factory.unitPriceOffer.IUnitPriceOffer[];
            const limit = 100;
            const page = 1;
            const searchOffersResult = await offerService.search({
                limit: limit,
                page: page,
                sort: {
                    'priceSpecification.price': chevre.factory.sortType.Descending
                },
                project: { id: { $eq: req.project.id } },
                itemOffered: { typeOf: { $eq: req.query.itemOffered?.typeOf } },
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
        } catch (err) {
            res.json({
                success: false,
                results: err
            });
        }
    }
);

async function createFromBody(req: Request, useEventServiceAsProduct: boolean): Promise<{
    offerCatalogFromBody: chevre.factory.offerCatalog.IOfferCatalog;
    serviceTypeFromBody?: chevre.factory.offerCatalog.IServiceType | undefined;
}> {
    let itemListElement: chevre.factory.offerCatalog.IItemListElement[] = [];
    if (Array.isArray(req.body.itemListElement)) {
        let offerIdsFromBody: string[] = (<any[]>req.body.itemListElement).map((element) => String(element.id));
        // 念のため重複排除
        offerIdsFromBody = [...new Set(offerIdsFromBody)];
        itemListElement = offerIdsFromBody.map((offerId) => {
            return {
                typeOf: chevre.factory.offerType.Offer,
                id: offerId
            };
        });
    }

    // 興行管理移行済であれば、NEW_MAX_NUM_OFFER
    const maxNumOffer = (useEventServiceAsProduct) ? NEW_MAX_NUM_OFFER : DEFAULT_MAX_NUM_OFFER;
    if (itemListElement.length > maxNumOffer) {
        throw new Error(`オファー数の上限は${maxNumOffer}です`);
    }
    const itemOfferedType = req.body.itemOffered?.typeOf;
    let serviceType: chevre.factory.offerCatalog.IServiceType | undefined;
    if (itemOfferedType === chevre.factory.product.ProductType.EventService) {
        if (typeof req.body.serviceType === 'string' && req.body.serviceType.length > 0) {
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchServiceTypesResult = await categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
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

    const offerCatalogFromBody: chevre.factory.offerCatalog.IOfferCatalog = {
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
            ? (<any[]>req.body.additionalProperty).filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined
    };

    return { offerCatalogFromBody, serviceTypeFromBody: serviceType };
}

function offerCatalog2eventService(
    offerCatalog: chevre.factory.offerCatalog.IOfferCatalog,
    serviceType?: chevre.factory.offerCatalog.IServiceType | undefined
): chevre.factory.product.IProduct {
    const eventServiceType: chevre.factory.product.IServiceType | undefined = (typeof serviceType?.typeOf === 'string')
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

    return {
        project: offerCatalog.project,
        typeOf: factory.product.ProductType.EventService,
        // productIDフォーマット確定(matches(/^[0-9a-zA-Z]+$/)に注意)(.isLength({ min: 3, max: 30 })に注意)
        productID: `${factory.product.ProductType.EventService}${offerCatalog.id}`,
        name: offerCatalog.name,
        hasOfferCatalog: { id: offerCatalog.id, typeOf: offerCatalog.typeOf },
        ...(typeof eventServiceType?.typeOf === 'string') ? { serviceType: eventServiceType } : undefined
    };
}

function validate(isNew: boolean) {
    return [
        ...(isNew)
            ? [
                body('identifier')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .isLength({ min: 3, max: 30 })
                    .withMessage('3~30文字で入力してください')
                    .matches(/^[0-9a-zA-Z]+$/)
                    .withMessage(() => '英数字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
            ]
            : [
                body('identifier')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .isLength({ min: 3, max: 30 })
                    .withMessage('3~30文字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
                // .matches(/^[0-9a-zA-Z\-\+\s]+$/)
                // .withMessage(() => '英数字で入力してください')
            ],
        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA)),
        body('name.en')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '英語名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME_JA)),
        body('itemOffered.typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'アイテム')),
        body('itemListElement')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'オファーリスト')),
        body('additionalProperty.*.name')
            .optional()
            .if((value: any) => String(value).length > 0)
            .if((value: any) => !ADDITIONAL_PROPERTY_NAME_VALIDATION_EXCEPTIONS.includes(value))
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}

export { offerCatalogsRouter };
