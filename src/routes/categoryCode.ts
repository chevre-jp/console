/**
 * カテゴリーコードルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, Meta, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { categoryCodeSets } from '../factory/categoryCodeSet';
import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';

const NUM_ADDITIONAL_PROPERTY = 10;

const categoryCodesRouter = Router();

categoryCodesRouter.get(
    '/([\$])image([\$])',
    (__, res) => {
        res.status(NO_CONTENT)
            .end();
    }
);

categoryCodesRouter.get(
    '/image',
    (req, res) => {
        if (typeof req.query.url === 'string' && req.query.url.length > 0) {
            res.redirect(req.query.url);
        } else {
            res.status(NO_CONTENT)
                .end();
        }
    }
);

categoryCodesRouter.get(
    '',
    async (_, res) => {
        res.render('categoryCodes/index', {
            message: '',
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: categoryCodeSets
        });
    }
);

categoryCodesRouter.get(
    '/search',
    async (req, res) => {
        try {
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await categoryCodeService.search({
                limit: limit,
                page: page,
                sort: { codeValue: chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                inCodeSet: {
                    identifier: {
                        $eq: (typeof req.query.inCodeSet?.identifier === 'string' && req.query.inCodeSet.identifier.length > 0)
                            ? req.query.inCodeSet.identifier
                            : undefined,
                        $in: (Array.isArray(req.query.inCodeSet?.identifier?.$in))
                            ? req.query.inCodeSet?.identifier.$in
                            : undefined
                    }
                },
                codeValue: {
                    $eq: (typeof req.query.codeValue?.$eq === 'string' && req.query.codeValue.$eq.length > 0)
                        ? req.query.codeValue.$eq
                        : undefined
                },
                name: {
                    $regex: (typeof req.query.name?.$regex === 'string' && req.query.name.$regex.length > 0)
                        ? req.query.name.$regex
                        : undefined
                },
                paymentMethod: {
                    typeOf: {
                        $eq: (typeof req.query.paymentMethod?.typeOf === 'string' && req.query.paymentMethod.typeOf.length > 0)
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
                    const categoryCodeSet = categoryCodeSets.find((c) => c.identifier === d.inCodeSet.identifier);

                    return {
                        ...d,
                        categoryCodeSetName: categoryCodeSet?.name
                    };
                })
            });
        } catch (error) {
            res.json({
                success: false,
                message: error.message,
                count: 0,
                results: []
            });
        }
    }
);

categoryCodesRouter.all<any>(
    '/new',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    let categoryCode = createCategoryCodeFromBody(req, true);

                    // コード重複確認
                    switch (categoryCode.inCodeSet.identifier) {
                        // 決済カード区分については、同セット内でユニーク
                        case chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType:
                            const { data } = await categoryCodeService.search({
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
                            const searchCategoryCodesGloballyResult = await categoryCodeService.search({
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

                    categoryCode = await categoryCodeService.create(categoryCode);

                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/categoryCodes/${categoryCode.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            appliesToCategoryCode: {},
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchProductsResult = await productService.search({
            project: { id: { $eq: req.project.id } },
            typeOf: {
                $in: [
                    chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                    chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                ]
            }
        });

        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            } else {
                forms.inCodeSet = undefined;
            }
        }

        res.render('categoryCodes/new', {
            message: message,
            errors: errors,
            forms: forms,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: categoryCodeSets,
            paymentServices: searchProductsResult.data
        });
    }
);

categoryCodesRouter.get(
    '/:id/image',
    (__, res) => {
        res.status(NO_CONTENT)
            .end();
    }
);

// tslint:disable-next-line:use-default-type-parameter
categoryCodesRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let categoryCode = await categoryCodeService.findById({
            id: req.params.id
        });

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                // コンテンツDB登録
                try {
                    categoryCode = { ...createCategoryCodeFromBody(req, false), ...{ id: categoryCode.id } };
                    await categoryCodeService.update(categoryCode);
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
            ...categoryCode,
            ...{
                inCodeSet: categoryCodeSets.find((s) => s.identifier === categoryCode.inCodeSet.identifier)
            },
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchProductsResult = await productService.search({
            project: { id: { $eq: req.project.id } },
            typeOf: {
                $in: [
                    chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                    chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                ]
            }
        });

        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            } else {
                forms.inCodeSet = undefined;
            }
        }

        res.render('categoryCodes/update', {
            message: message,
            errors: errors,
            forms: forms,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: categoryCodeSets,
            paymentServices: searchProductsResult.data
        });
    }
);

categoryCodesRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            // const eventService = new chevre.service.Event({
            //     endpoint: <string>process.env.API_ENDPOINT,
            //     auth: req.user.authClient
            // });
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const categoryCode = await categoryCodeService.findById({ id: req.params.id });
            await preDelete(req, categoryCode);

            await categoryCodeService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function preDelete(req: Request, categoryCode: chevre.factory.categoryCode.ICategoryCode) {
    // validation
    const creativeWorkService = new chevre.service.CreativeWork({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
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
    const offerCatalogService = new chevre.service.OfferCatalog({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const placeService = new chevre.service.Place({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const priceSpecificationService = new chevre.service.PriceSpecification({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const productService = new chevre.service.Product({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // 関連する価格仕様
    const searchPriceSpecificationsResult = await priceSpecificationService.search({
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
        case chevre.factory.categoryCode.CategorySetIdentifier.MembershipType:
            const searchProductsResult = await productService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                serviceOutput: { typeOf: { $eq: categoryCode.codeValue } }
            });
            if (searchProductsResult.data.length > 0) {
                throw new Error('関連するプロダクトが存在します');
            }

            const searchOffersResult4membershipType = await offerService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                eligibleMembershipType: { codeValue: { $eq: categoryCode.codeValue } }
            });
            if (searchOffersResult4membershipType.data.length > 0) {
                throw new Error('関連するオファーが存在します');
            }
            break;
        // 通貨区分
        case chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType:
            const searchProductsResult4currencyType = await productService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                serviceOutput: { amount: { currency: { $eq: categoryCode.codeValue } } }
            });
            if (searchProductsResult4currencyType.data.length > 0) {
                throw new Error('関連するプロダクトが存在します');
            }

            const searchOffersResult4currencyType = await offerService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                eligibleMonetaryAmount: { currency: { $eq: categoryCode.codeValue } }
            });
            if (searchOffersResult4currencyType.data.length > 0) {
                throw new Error('関連するオファーが存在します');
            }
            break;
        // レイティング区分
        case chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType:
            const searchMoviesResult4contentRating = await creativeWorkService.searchMovies({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                contentRating: { $eq: categoryCode.codeValue }
            });
            if (searchMoviesResult4contentRating.data.length > 0) {
                throw new Error('関連するコンテンツが存在します');
            }
            break;
        // 配給区分
        case chevre.factory.categoryCode.CategorySetIdentifier.DistributorType:
            const searchMoviesResult4distributorType = await creativeWorkService.searchMovies({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                distributor: { codeValue: { $eq: categoryCode.codeValue } }
            });
            if (searchMoviesResult4distributorType.data.length > 0) {
                throw new Error('関連するコンテンツが存在します');
            }
            break;
        // 決済カード区分
        case chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType:
            const searchOffersResult4movieTicketType = await offerService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                priceSpecification: {
                    appliesToMovieTicket: {
                        serviceType: { $eq: categoryCode.codeValue },
                        serviceOutput: { typeOf: { $eq: categoryCode.paymentMethod?.typeOf } }
                    }
                }
            });
            if (searchOffersResult4movieTicketType.data.length > 0) {
                throw new Error('関連するオファーが存在します');
            }
            break;
        // オファーカテゴリー区分
        case chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType:
            const searchOffersResult = await offerService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                category: { codeValue: { $in: [categoryCode.codeValue] } }
            });
            if (searchOffersResult.data.length > 0) {
                throw new Error('関連するオファーが存在します');
            }
            break;
        // 決済方法区分
        case chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType:
            const searchProductsResult4paymentMethodType = await productService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                serviceOutput: { typeOf: { $eq: categoryCode.codeValue } }
            });
            if (searchProductsResult4paymentMethodType.data.length > 0) {
                throw new Error('関連するプロダクトが存在します');
            }
            break;
        // 座席区分
        case chevre.factory.categoryCode.CategorySetIdentifier.SeatingType:
            const searchSeatsResult = await placeService.searchSeats({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                seatingType: { $eq: categoryCode.codeValue }
            });
            if (searchSeatsResult.data.length > 0) {
                throw new Error('関連する座席が存在します');
            }

            const searchOffersResult4seatingType = await offerService.search({
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
        case chevre.factory.categoryCode.CategorySetIdentifier.ServiceType:
            const searchOfferCatalogsResult = await offerCatalogService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                itemOffered: { serviceType: { codeValue: { $eq: categoryCode.codeValue } } }
            });
            if (searchOfferCatalogsResult.data.length > 0) {
                throw new Error('関連するオファーカタログが存在します');
            }
            break;
        // 音響方式区分
        case chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType:
            // 関連する施設コンテンツ
            const searchEventsResult4soundFormatType = await eventService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                typeOf: chevre.factory.eventType.ScreeningEventSeries,
                soundFormat: { typeOf: { $eq: categoryCode.codeValue } }
            });
            if (searchEventsResult4soundFormatType.data.length > 0) {
                throw new Error('関連する施設コンテンツが存在します');
            }
            break;
        // 上映方式区分
        case chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType:
            // 関連する施設コンテンツ
            const searchEventsResult4videoFormatType = await eventService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                typeOf: chevre.factory.eventType.ScreeningEventSeries,
                videoFormat: { typeOf: { $eq: categoryCode.codeValue } }
            });
            if (searchEventsResult4videoFormatType.data.length > 0) {
                throw new Error('関連する施設コンテンツが存在します');
            }
            break;
        default:
    }
}

function createCategoryCodeFromBody(req: Request, isNew: boolean): chevre.factory.categoryCode.ICategoryCode {
    const paymentMethodType = req.body.paymentMethod?.typeOf;

    const image: string | undefined = (typeof req.body.image === 'string' && req.body.image.length > 0)
        ? req.body.image
        : undefined;

    const color: string | undefined = (typeof req.body.color === 'string' && req.body.color.length > 0)
        ? req.body.color
        : undefined;

    const inCodeSet = JSON.parse(req.body.inCodeSet);

    const nameEn = req.body.name?.en;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: 'CategoryCode',
        codeValue: req.body.codeValue,
        inCodeSet: {
            typeOf: 'CategoryCodeSet',
            identifier: inCodeSet.identifier
        },
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        name: {
            ja: req.body.name.ja,
            ...(typeof nameEn === 'string' && nameEn.length > 0) ? { en: nameEn } : undefined
        },
        ...(inCodeSet.identifier === chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType)
            ? {
                paymentMethod: {
                    typeOf: paymentMethodType
                }
            }
            : undefined,
        ...(typeof image === 'string') ? { image } : undefined,
        ...(typeof color === 'string') ? { color } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(typeof image !== 'string') ? { image: 1 } : undefined,
                    ...(typeof color !== 'string') ? { color: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        body('inCodeSet')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '区分分類')),

        body('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            // .isAlphanumeric()
            .matches(/^[0-9a-zA-Z\+]+$/)
            .isLength({ max: 20 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 20))
            // 予約語除外
            .not()
            .isIn(RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),

        body('name.en')
            .optional()
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語名称', 30)),

        body('paymentMethod.typeOf')
            .if((_: any, { req }: Meta) => {
                let inCodeSet: any;
                try {
                    inCodeSet = JSON.parse(String(req.body.inCodeSet));
                } catch (error) {
                    // no op
                }

                return inCodeSet?.identifier === chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType;
            })
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済方法'))
    ];
}

export default categoryCodesRouter;
