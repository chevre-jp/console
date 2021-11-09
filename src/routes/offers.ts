/**
 * 単価オファー管理ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, oneOf, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';

import * as Message from '../message';

// import { itemAvailabilities } from '../factory/itemAvailability';
import { ProductType, productTypes } from '../factory/productType';
import { createFromBody } from './ticketType';

export const SMART_THEATER_CLIENT_OLD = process.env.SMART_THEATER_CLIENT_OLD;
export const SMART_THEATER_CLIENT_NEW = process.env.SMART_THEATER_CLIENT_NEW;

const NUM_ADDITIONAL_PROPERTY = 10;

// コード 半角64
const NAME_MAX_LENGTH_CODE = 30;
// 名称・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// 金額
const CHAGE_MAX_LENGTH = 10;

const offersRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
offersRouter.all<ParamsDictionary>(
    '/add',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const itemOfferedTypeOf = req.query.itemOffered?.typeOf;
        if (itemOfferedTypeOf === ProductType.EventService) {
            res.redirect(`/projects/${req.project.id}/ticketTypes/add`);

            return;
        }

        const offerService = new chevre.service.Offer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new chevre.service.CategoryCode({
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
                // 登録プロセス
                try {
                    req.body.id = '';
                    let offer = await createFromBody(req, true);

                    // コード重複確認
                    const searchOffersResult = await offerService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        identifier: { $eq: offer.identifier }
                    });
                    if (searchOffersResult.data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    offer = await offerService.create(offer);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/offers/${offer.id}/update`);

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
            itemOffered: { typeOf: itemOfferedTypeOf },
            // isBoxTicket: (typeof req.body.isBoxTicket !== 'string' || req.body.isBoxTicket.length === 0) ? '' : req.body.isBoxTicket,
            // isOnlineTicket: (typeof req.body.isOnlineTicket !== 'string' || req.body.isOnlineTicket.length === 0)
            //     ? ''
            //     : req.body.isOnlineTicket,
            // seatReservationUnit: (typeof req.body.seatReservationUnit !== 'string' || req.body.seatReservationUnit.length === 0)
            //     ? '1'
            //     : req.body.seatReservationUnit,
            ...req.body
        };
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
            } else {
                forms.category = undefined;
            }

            // 細目を保管
            if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
                forms.accounting = JSON.parse(req.body.accounting);
            } else {
                forms.accounting = undefined;
            }

            // 利用可能アプリケーションを保管
            const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
            if (Array.isArray(availableAtOrFromParams)) {
                forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                    return { id: applicationId };
                });
            } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
                forms.availableAtOrFrom = { id: availableAtOrFromParams };
            }

            // ポイント特典を保管
            if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0) {
                forms.pointAwardCurrecy = JSON.parse(req.body.pointAwardCurrecy);
            } else {
                forms.pointAwardCurrecy = undefined;
            }
        }

        const searchOfferCategoryTypesResult = await categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
        });

        const searchAccountTitlesResult = await accountTitleService.search({
            project: { id: { $eq: req.project.id } }
        });

        const applications = await searchApplications(req);

        res.render('offers/add', {
            message: message,
            errors: errors,
            forms: forms,
            ticketTypeCategories: searchOfferCategoryTypesResult.data,
            accountTitles: searchAccountTitlesResult.data,
            productTypes: productTypes,
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
);

// tslint:disable-next-line:use-default-type-parameter
offersRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const itemOfferedTypeOf = req.query.itemOffered?.typeOf;
        if (itemOfferedTypeOf === ProductType.EventService) {
            res.redirect(`/projects/${req.project.id}/ticketTypes/${req.params.id}/update`);

            return;
        }

        const offerService = new chevre.service.Offer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            let offer = await offerService.findById({ id: req.params.id });

            if (offer.itemOffered?.typeOf === ProductType.EventService) {
                res.redirect(`/projects/${req.project.id}/ticketTypes/${req.params.id}/update`);

                return;
            }

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        req.body.id = req.params.id;
                        offer = await createFromBody(req, false);
                        await offerService.update(offer);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const accountsReceivable = (typeof offer.priceSpecification?.accounting?.accountsReceivable === 'number')
                ? String(offer.priceSpecification.accounting.accountsReceivable)
                : '';

            const forms = {
                ...offer,
                accountsReceivable,
                validFrom: (offer.validFrom !== undefined)
                    ? moment(offer.validFrom)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : '',
                validThrough: (offer.validThrough !== undefined)
                    ? moment(offer.validThrough)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : '',
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
                if (typeof req.body.category === 'string' && req.body.category.length > 0) {
                    forms.category = JSON.parse(req.body.category);
                } else {
                    forms.category = undefined;
                }

                // 細目を保管
                if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
                    forms.accounting = JSON.parse(req.body.accounting);
                } else {
                    forms.accounting = undefined;
                }

                // 利用可能アプリケーションを保管
                const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
                if (Array.isArray(availableAtOrFromParams)) {
                    forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                        return { id: applicationId };
                    });
                } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
                    forms.availableAtOrFrom = { id: availableAtOrFromParams };
                }

                // ポイント特典を保管
                if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0) {
                    forms.pointAwardCurrecy = JSON.parse(req.body.pointAwardCurrecy);
                } else {
                    forms.pointAwardCurrecy = undefined;
                }
            } else {
                // カテゴリーを検索
                if (typeof offer.category?.codeValue === 'string') {
                    const searchOfferCategoriesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
                        codeValue: { $eq: offer.category.codeValue }
                    });
                    forms.category = searchOfferCategoriesResult.data[0];
                }

                // 細目を検索
                if (typeof offer.priceSpecification?.accounting?.operatingRevenue?.codeValue === 'string') {
                    const searchAccountTitlesResult = await accountTitleService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        codeValue: { $eq: offer.priceSpecification.accounting.operatingRevenue?.codeValue }
                    });
                    forms.accounting = searchAccountTitlesResult.data[0];
                }

                // ポイント特典を検索
                if (typeof offer.itemOffered?.pointAward?.amount?.currency === 'string') {
                    const searchEligibleCurrencyTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                        codeValue: { $eq: offer.itemOffered.pointAward.amount.currency }
                    });
                    forms.pointAwardCurrecy = searchEligibleCurrencyTypesResult.data[0];
                    forms.pointAwardValue = offer.itemOffered.pointAward.amount.value;
                } else {
                    forms.pointAwardCurrecy = undefined;
                    forms.pointAwardValue = undefined;
                }
            }

            const searchOfferCategoryTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
            });

            const applications = await searchApplications(req);

            res.render('offers/update', {
                message: message,
                errors: errors,
                forms: forms,
                ticketTypeCategories: searchOfferCategoryTypesResult.data,
                productTypes: productTypes,
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
        } catch (error) {
            next(error);
        }
    }
);

offersRouter.get(
    '/:id/catalogs',
    async (req, res) => {
        try {
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = 100;
            const page = 1;
            const { data } = await offerCatalogService.search({
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

offersRouter.get(
    '/:id/availableApplications',
    async (req, res) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            // const iamService = new cinerino.service.IAM({
            //     endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            //     auth: req.user.authClient,
            //     project: { id: req.project.id }
            // });

            let data: any[] = [];
            const offer = await offerService.findById({ id: req.params.id });
            if (Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom.length > 0) {
                const searchApplicationsResult = await iamService.searchMembers({
                    member: {
                        typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication },
                        id: { $in: offer.availableAtOrFrom.map((a: any) => a.id) }
                    }
                });

                data = searchApplicationsResult.data.map((m) => m.member);
            }

            res.json({
                success: true,
                count: data.length,
                results: data
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

/**
 * オファー検索
 */
offersRouter.get(
    '',
    async (__, res) => {
        res.render('offers/index', {
            message: '',
            productTypes: productTypes
        });
    }
);

offersRouter.get(
    '/getlist',
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
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

            const searchOfferCategoryTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
            });
            const offerCategoryTypes = searchOfferCategoryTypesResult.data;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const identifierRegex = req.query.identifier;

            const searchConditions: chevre.factory.offer.ISearchConditions = {
                limit: limit,
                page: page,
                sort: { 'priceSpecification.price': chevre.factory.sortType.Ascending },
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
                        $eq: (typeof req.query.eligibleMonetaryAmount?.currency === 'string'
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
                itemOffered: {
                    typeOf: {
                        $eq: (typeof req.query.itemOffered?.typeOf === 'string' && req.query.itemOffered?.typeOf.length > 0)
                            ? req.query.itemOffered?.typeOf
                            : undefined
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
                                $eq: (typeof req.query.accountTitle?.codeValue === 'string' && req.query.accountTitle.codeValue.length > 0)
                                    ? String(req.query.accountTitle.codeValue)
                                    : undefined
                            }
                        }
                    },
                    appliesToMovieTicket: {
                        serviceType: {
                            $eq: (typeof req.query.appliesToMovieTicket === 'string'
                                && req.query.appliesToMovieTicket.length > 0)
                                ? <string>JSON.parse(req.query.appliesToMovieTicket).codeValue
                                : undefined
                        },
                        serviceOutput: {
                            typeOf: {
                                $eq: (typeof req.query.appliesToMovieTicket === 'string'
                                    && req.query.appliesToMovieTicket.length > 0)
                                    ? <string>JSON.parse(req.query.appliesToMovieTicket).paymentMethod?.typeOf
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
                            $eq: (typeof req.query.addOn?.itemOffered?.id === 'string' && req.query.addOn.itemOffered.id.length > 0)
                                ? req.query.addOn.itemOffered.id
                                : undefined
                        }
                    }
                }
            };

            let data: chevre.factory.offer.IUnitPriceOffer[];
            const searchResult = await offerService.search(searchConditions);
            data = searchResult.data;

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                // tslint:disable-next-line:cyclomatic-complexity
                results: data.map((t) => {
                    const categoryCode = t.category?.codeValue;

                    const productType = productTypes.find((p) => p.codeValue === t.itemOffered?.typeOf);
                    // const itemAvailability = itemAvailabilities.find((i) => i.codeValue === t.availability);

                    const referenceQuantityUnitCode = t.priceSpecification?.referenceQuantity.unitCode;
                    let priceUnitStr = String(referenceQuantityUnitCode);
                    switch (referenceQuantityUnitCode) {
                        case chevre.factory.unitCode.C62:
                            if (req.query.itemOffered?.typeOf === ProductType.EventService) {
                                priceUnitStr = '枚';
                            } else {
                                priceUnitStr = '点';
                            }
                            break;
                        case chevre.factory.unitCode.Ann:
                            priceUnitStr = '年';
                            break;
                        case chevre.factory.unitCode.Day:
                            priceUnitStr = '日';
                            break;
                        case chevre.factory.unitCode.Sec:
                            priceUnitStr = '秒';
                            break;
                        default:
                    }
                    const priceCurrencyStr = (t.priceSpecification?.priceCurrency === chevre.factory.priceCurrency.JPY)
                        ? '円'
                        : t.priceSpecification?.priceCurrency;
                    const priceStr = `${t.priceSpecification?.price} ${priceCurrencyStr} / ${t.priceSpecification?.referenceQuantity.value} ${priceUnitStr}`;

                    return {
                        ...t,
                        itemOfferedName: productType?.name,
                        // availabilityName: itemAvailability?.name,
                        availableAtOrFromCount: (Array.isArray(t.availableAtOrFrom))
                            ? t.availableAtOrFrom.length
                            : 0,
                        categoryName: (typeof categoryCode === 'string')
                            ? (<chevre.factory.multilingualString>offerCategoryTypes.find((c) => c.codeValue === categoryCode)?.name)?.ja
                            : '',
                        addOnCount: (Array.isArray(t.addOn))
                            ? t.addOn.length
                            : 0,
                        priceStr,
                        validFromStr: (t.validFrom !== undefined || t.validThrough !== undefined) ? '有' : ''
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

offersRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // validation
            const offer = await offerService.findById({ id: req.params.id });
            await preDelete(req, offer);

            await offerService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

const AVAILABLE_ROLE_NAMES = ['customer', 'pos'];

export async function searchApplications(req: Request) {
    const iamService = new chevre.service.IAM({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchApplicationsResult = await iamService.searchMembers({
        member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
    });

    let applications = searchApplicationsResult.data;

    // 新旧クライアントが両方存在すれば、新クライアントを隠す
    const memberIds = applications.map((a) => a.member.id);
    if (typeof SMART_THEATER_CLIENT_OLD === 'string' && SMART_THEATER_CLIENT_OLD.length > 0
        && typeof SMART_THEATER_CLIENT_NEW === 'string' && SMART_THEATER_CLIENT_NEW.length > 0
    ) {
        const oldClientExists = memberIds.includes(SMART_THEATER_CLIENT_OLD);
        const newClientExists = memberIds.includes(SMART_THEATER_CLIENT_NEW);
        if (oldClientExists && newClientExists) {
            applications = applications.filter((a) => a.member.id !== SMART_THEATER_CLIENT_NEW);
        }
    }

    // ロールで絞る(customer or pos)
    applications = applications
        .filter((m) => {
            return Array.isArray(m.member.hasRole) && m.member.hasRole.some((r) => AVAILABLE_ROLE_NAMES.includes(r.roleName));
        });

    return applications;
}

async function preDelete(req: Request, offer: chevre.factory.offer.IOffer) {
    // validation
    const offerCatalogService = new chevre.service.OfferCatalog({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchCatalogsResult = await offerCatalogService.search({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        itemListElement: {
            id: { $in: [String(offer.id)] }
        }
    });
    if (searchCatalogsResult.data.length > 0) {
        throw new Error('関連するオファーカタログが存在します');
    }
}

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
// async function createFromBody(req: Request, isNew: boolean): Promise<chevre.factory.offer.IUnitPriceOffer> {
//     const categoryCodeService = new chevre.service.CategoryCode({
//         endpoint: <string>process.env.API_ENDPOINT,
//         auth: req.user.authClient,
//         project: { id: req.project.id }
//     });

//     let itemOffered: chevre.factory.offer.IItemOffered;
//     const itemOfferedTypeOf = req.body.itemOffered?.typeOf;
//     switch (itemOfferedTypeOf) {
//         case ProductType.PaymentCard:
//         case ProductType.Product:
//         case ProductType.MembershipService:
//             itemOffered = {
//                 typeOf: itemOfferedTypeOf,
//                 serviceOutput: {
//                 }
//             };
//             break;

//         default:
//             throw new Error(`${req.body.itemOffered?.typeOf} not implemented`);
//     }

//     let offerCategory: chevre.factory.categoryCode.ICategoryCode | undefined;

//     if (typeof req.body.category === 'string' && req.body.category.length > 0) {
//         const selectedCategory = JSON.parse(req.body.category);
//         const searchOfferCategoryTypesResult = await categoryCodeService.search({
//             limit: 1,
//             project: { id: { $eq: req.project.id } },
//             inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
//             codeValue: { $eq: selectedCategory.codeValue }
//         });
//         if (searchOfferCategoryTypesResult.data.length === 0) {
//             throw new Error('オファーカテゴリーが見つかりません');
//         }
//         offerCategory = searchOfferCategoryTypesResult.data[0];
//     }

//     const availability: chevre.factory.itemAvailability = chevre.factory.itemAvailability.InStock;

//     const eligibleQuantityMinValue: number | undefined = (req.body.priceSpecification !== undefined
//         && req.body.priceSpecification.eligibleQuantity !== undefined
//         && req.body.priceSpecification.eligibleQuantity.minValue !== undefined
//         && req.body.priceSpecification.eligibleQuantity.minValue !== '')
//         ? Number(req.body.priceSpecification.eligibleQuantity.minValue)
//         : undefined;
//     const eligibleQuantityMaxValue: number | undefined = (req.body.priceSpecification !== undefined
//         && req.body.priceSpecification.eligibleQuantity !== undefined
//         && req.body.priceSpecification.eligibleQuantity.maxValue !== undefined
//         && req.body.priceSpecification.eligibleQuantity.maxValue !== '')
//         ? Number(req.body.priceSpecification.eligibleQuantity.maxValue)
//         : undefined;
//     const eligibleQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode.C62> | undefined =
//         (eligibleQuantityMinValue !== undefined || eligibleQuantityMaxValue !== undefined)
//             ? {
//                 typeOf: <'QuantitativeValue'>'QuantitativeValue',
//                 minValue: eligibleQuantityMinValue,
//                 maxValue: eligibleQuantityMaxValue,
//                 unitCode: chevre.factory.unitCode.C62
//             }
//             : undefined;

//     const eligibleTransactionVolumePrice: number | undefined = (req.body.priceSpecification !== undefined
//         && req.body.priceSpecification.eligibleTransactionVolume !== undefined
//         && req.body.priceSpecification.eligibleTransactionVolume.price !== undefined
//         && req.body.priceSpecification.eligibleTransactionVolume.price !== '')
//         ? Number(req.body.priceSpecification.eligibleTransactionVolume.price)
//         : undefined;
//     // tslint:disable-next-line:max-line-length
// tslint:disable-next-line:max-line-length
//     const eligibleTransactionVolume: chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType> | undefined =
//         (eligibleTransactionVolumePrice !== undefined)
//             ? {
//                 project: { typeOf: req.project.typeOf, id: req.project.id },
//                 typeOf: chevre.factory.priceSpecificationType.PriceSpecification,
//                 price: eligibleTransactionVolumePrice,
//                 priceCurrency: chevre.factory.priceCurrency.JPY,
//                 valueAddedTaxIncluded: true
//             }
//             : undefined;

//     const accounting: chevre.factory.priceSpecification.IAccounting = {
//         typeOf: 'Accounting',
//         accountsReceivable: Number(req.body.accountsReceivable) * 1
//     };
//     if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
//         const selectedAccountTitle = JSON.parse(req.body.accounting);
//         accounting.operatingRevenue = {
//             project: { typeOf: req.project.typeOf, id: req.project.id },
//             typeOf: 'AccountTitle',
//             codeValue: selectedAccountTitle.codeValue
//         };
//     }

//     let nameFromJson: any = {};
//     if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
//         try {
//             nameFromJson = JSON.parse(req.body.nameStr);
//         } catch (error) {
//             throw new Error(`高度な名称の型が不適切です ${error.message}`);
//         }
//     }

//     let validFrom: Date | undefined;
//     if (typeof req.body.validFrom === 'string' && req.body.validFrom.length > 0) {
//         validFrom = moment(`${req.body.validFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
//             .toDate();
//     }

//     let validThrough: Date | undefined;
//     if (typeof req.body.validThrough === 'string' && req.body.validThrough.length > 0) {
//         validThrough = moment(`${req.body.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
//             .toDate();
//     }

//     const referenceQuantityValue: number | chevre.factory.quantitativeValue.StringValue.Infinity =
//         (req.body.priceSpecification.referenceQuantity.value === chevre.factory.quantitativeValue.StringValue.Infinity)
//             ? chevre.factory.quantitativeValue.StringValue.Infinity
//             : Number(req.body.priceSpecification.referenceQuantity.value);
//     const referenceQuantityUnitCode = <chevre.factory.unitCode>req.body.priceSpecification.referenceQuantity.unitCode;
//     const referenceQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode> = {
//         typeOf: 'QuantitativeValue',
//         value: referenceQuantityValue,
//         unitCode: referenceQuantityUnitCode
//     };

//     if (typeof referenceQuantityValue === 'number') {
//         // 最大1年まで
//         const MAX_REFERENCE_QUANTITY_VALUE_IN_SECONDS = 31536000;
//         let referenceQuantityValueInSeconds = referenceQuantityValue;
//         switch (referenceQuantityUnitCode) {
//             case chevre.factory.unitCode.Ann:
//                 // tslint:disable-next-line:no-magic-numbers
//                 referenceQuantityValueInSeconds = referenceQuantityValue * 31536000;
//                 break;
//             case chevre.factory.unitCode.Day:
//                 // tslint:disable-next-line:no-magic-numbers
//                 referenceQuantityValueInSeconds = referenceQuantityValue * 86400;
//                 break;
//             case chevre.factory.unitCode.Sec:
//                 break;
//             case chevre.factory.unitCode.C62:
//                 // C62の場合、単価単位期間制限は実質無効
//                 referenceQuantityValueInSeconds = 0;
//                 break;
//             default:
//                 throw new Error(`${referenceQuantity.unitCode} not implemented`);
//         }
//         if (referenceQuantityValueInSeconds > MAX_REFERENCE_QUANTITY_VALUE_IN_SECONDS) {
//             throw new Error('単価単位期間は最大で1年です');
//         }
//     } else if (referenceQuantityValue === chevre.factory.quantitativeValue.StringValue.Infinity) {
//         if (itemOffered.typeOf !== chevre.factory.product.ProductType.PaymentCard) {
//             throw new Error('適用数が不適切です');
//         }
//     } else {
//         throw new Error('適用数が不適切です');
//     }

// tslint:disable-next-line:max-line-length
//     const priceSpec: chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.UnitPriceSpecification> = {
//         project: { typeOf: req.project.typeOf, id: req.project.id },
//         typeOf: chevre.factory.priceSpecificationType.UnitPriceSpecification,
//         name: req.body.name,
//         price: Number(req.body.priceSpecification.price),
//         priceCurrency: chevre.factory.priceCurrency.JPY,
//         valueAddedTaxIncluded: true,
//         referenceQuantity: referenceQuantity,
//         accounting: accounting,
//         eligibleQuantity: eligibleQuantity,
//         eligibleTransactionVolume: eligibleTransactionVolume
//     };

//     let pointAward: {
//         /**
//          * 付与金額
//          */
//         amount?: chevre.factory.monetaryAmount.IMonetaryAmount;
//         /**
//          * 特典説明
//          */
//         description?: string;
//         typeOf: chevre.factory.actionType.MoneyTransfer;
//     } | undefined;

//     // ポイント特典通貨と金額の指定があれば適用する
//     const pointAwardAmountValueByBody = req.body.itemOffered?.pointAward?.amount?.value;
//     const pointAwardDescriptionByBody = req.body.itemOffered?.pointAward?.description;
//     if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0
//         && typeof pointAwardAmountValueByBody === 'string' && pointAwardAmountValueByBody.length > 0) {
//         const selectedCurrencyType = JSON.parse(req.body.pointAwardCurrecy);

//         pointAward = {
//             amount: {
//                 typeOf: 'MonetaryAmount',
//                 currency: selectedCurrencyType.codeValue,
//                 value: Number(pointAwardAmountValueByBody)
//             },
//             typeOf: chevre.factory.actionType.MoneyTransfer,
//             ...(typeof pointAwardDescriptionByBody === 'string' && pointAwardDescriptionByBody.length > 0)
//                 ? { description: pointAwardDescriptionByBody }
//                 : undefined
//         };
//     }
//     if (pointAward !== undefined) {
//         itemOffered.pointAward = pointAward;
//     }

//     // 利用可能なアプリケーション設定
//     const availableAtOrFrom: { id: string }[] = [];
//     const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
//     if (Array.isArray(availableAtOrFromParams)) {
//         availableAtOrFromParams.forEach((applicationId) => {
//             if (typeof applicationId === 'string' && applicationId.length > 0) {
//                 availableAtOrFrom.push({ id: applicationId });
//             }
//         });
//     } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
//         availableAtOrFrom.push({ id: availableAtOrFromParams });
//     }

//     let color: string = 'rgb(51, 51, 51)';
//     if (typeof req.body.color === 'string' && req.body.color.length > 0) {
//         color = req.body.color;
//     }

//     return {
//         project: { typeOf: req.project.typeOf, id: req.project.id },
//         typeOf: chevre.factory.offerType.Offer,
//         priceCurrency: chevre.factory.priceCurrency.JPY,
//         id: req.body.id,
//         identifier: req.body.identifier,
//         name: {
//             ...nameFromJson,
//             ja: req.body.name.ja,
//             en: req.body.name.en
//         },
//         description: req.body.description,
//         alternateName: { ja: <string>req.body.alternateName.ja, en: '' },
//         availability: availability,
//         availableAtOrFrom: availableAtOrFrom,
//         itemOffered: itemOffered,
//         // eligibleCustomerType: eligibleCustomerType,
//         priceSpecification: priceSpec,
//         additionalProperty: (Array.isArray(req.body.additionalProperty))
//             ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
//                 .map((p: any) => {
//                     return {
//                         name: String(p.name),
//                         value: String(p.value)
//                     };
//                 })
//             : undefined,
//         ...(typeof color === 'string')
//             ? {
//                 color: color
//             }
//             : undefined,
//         ...(offerCategory !== undefined)
//             ? {
//                 category: {
//                     project: offerCategory.project,
//                     id: offerCategory.id,
//                     codeValue: offerCategory.codeValue
//                 }
//             }
//             : undefined,
//         ...(validFrom instanceof Date)
//             ? {
//                 validFrom: validFrom
//             }
//             : undefined,
//         ...(validThrough instanceof Date)
//             ? {
//                 validThrough: validThrough
//             }
//             : undefined,
//         ...(!isNew)
//             ? {
//                 $unset: {
//                     ...(typeof color !== 'string') ? { color: 1 } : undefined,
//                     ...(offerCategory === undefined) ? { category: 1 } : undefined,
//                     ...(validFrom === undefined) ? { validFrom: 1 } : undefined,
//                     ...(validThrough === undefined) ? { validThrough: 1 } : undefined
//                 }
//             }
//             : undefined
//     };
// }

function validate() {
    return [
        body('identifier', Message.Common.required.replace('$fieldName$', 'コード'))
            .notEmpty()
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', 30))
            .matches(/^[0-9a-zA-Z\-_]+$/)
            .withMessage(() => '英数字で入力してください'),

        body('itemOffered.typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'アイテム')),

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE)),

        body('alternateName.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '代替名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('代替名称', NAME_MAX_LENGTH_NAME_JA)),

        body('priceSpecification.referenceQuantity.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用数')),

        oneOf([
            [
                body('priceSpecification.referenceQuantity.value')
                    .isIn([chevre.factory.quantitativeValue.StringValue.Infinity])
                    .withMessage(() => '正の値を入力してください')
            ],
            [
                body('priceSpecification.referenceQuantity.value')
                    .isInt()
                    .custom((value) => Number(value) >= 0)
                    .withMessage(() => '正の値を入力してください')
            ]
        ]),

        body('priceSpecification.referenceQuantity.unitCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用単位')),

        body('priceSpecification.price')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '発生金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(Message.Common.getMaxLengthHalfByte('発生金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('accountsReceivable')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '売上金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLengthHalfByte('売上金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')
    ];
}

export default offersRouter;
