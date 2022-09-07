/**
 * 価格仕様ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, Meta, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../message';

// import { categoryCodeSets } from '../factory/categoryCodeSet';
import { priceSpecificationTypes } from '../factory/priceSpecificationType';

const priceSpecificationsRouter = Router();

priceSpecificationsRouter.get(
    '',
    async (__, res) => {
        res.render('priceSpecifications/index', {
            message: '',
            PriceSpecificationType: chevre.factory.priceSpecificationType,
            priceSpecificationTypes: priceSpecificationTypes,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier
        });
    }
);

priceSpecificationsRouter.get(
    '/search',
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        try {
            const priceSpecificationService = new chevre.service.PriceSpecification({
                endpoint: <string>process.env.API_ENDPOINT,
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
            const { data } =
                await priceSpecificationService.search<chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification
                    | chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification>({
                        limit: limit,
                        page: page,
                        sort: { price: chevre.factory.sortType.Ascending },
                        project: { id: { $eq: req.project.id } },
                        typeOf: (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0)
                            ? req.query.typeOf
                            : undefined,
                        appliesToMovieTicket: {
                            serviceTypes: (typeof req.query.appliesToMovieTicket === 'string' && req.query.appliesToMovieTicket.length > 0)
                                ? [req.query.appliesToMovieTicket]
                                : undefined
                        },
                        appliesToCategoryCode: {
                            ...(typeof req.query.appliesToCategoryCode?.$elemMatch === 'string'
                                && req.query.appliesToCategoryCode.$elemMatch.length > 0)
                                ? {
                                    $elemMatch: {
                                        codeValue: { $eq: JSON.parse(req.query.appliesToCategoryCode.$elemMatch).codeValue },
                                        'inCodeSet.identifier': {
                                            $eq: JSON.parse(req.query.appliesToCategoryCode.$elemMatch).inCodeSet.identifier
                                        }
                                    }
                                }
                                : {}

                        }
                    });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((d) => {
                    const appliesToCategoryCode =
                        // tslint:disable-next-line:max-line-length
                        (Array.isArray((<chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification>>d).appliesToCategoryCode))
                            // tslint:disable-next-line:max-line-length
                            ? (<chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification>>d).appliesToCategoryCode[0]
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
                    const priceSpecificationType = priceSpecificationTypes.find((p) => p.codeValue === d.typeOf);

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

                    return {
                        ...d,
                        priceSpecificationTypeName: priceSpecificationType?.name,
                        // appliesToCategoryCodeSetName: categoryCodeSet?.name,
                        appliesToCategoryCode: appliesToCategoryCode
                        // appliesToCategoryCodeName: (applicableCategoryCode !== undefined)
                        //     ? `${(<chevre.factory.multilingualString>applicableCategoryCode.name).ja}`
                        //     : '',
                        // appliesToMovieTicketName: (applicableMovieTicket !== undefined)
                        // tslint:disable-next-line:max-line-length
                        //     ? `${applicableMovieTicket.paymentMethod?.typeOf} ${(<chevre.factory.multilingualString>applicableMovieTicket.name).ja}`
                        //     : '',
                        // appliesToVideoFormatName: (applicableVideoFormat !== undefined)
                        //     ? `${(<chevre.factory.multilingualString>applicableVideoFormat.name).ja}`
                        //     : ''
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

// tslint:disable-next-line:use-default-type-parameter
priceSpecificationsRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    let priceSpecification = await createFromBody(req, true);
                    const priceSpecificationService = new chevre.service.PriceSpecification({
                        endpoint: <string>process.env.API_ENDPOINT,
                        auth: req.user.authClient,
                        project: { id: req.project.id }
                    });
                    priceSpecification = await priceSpecificationService.create(priceSpecification);

                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/priceSpecifications/${priceSpecification.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            ...req.body
        };

        if (req.method === 'POST') {
            // 適用区分を保管
            if (typeof req.body.appliesToCategoryCode === 'string' && req.body.appliesToCategoryCode.length > 0) {
                forms.appliesToCategoryCode = JSON.parse(req.body.appliesToCategoryCode);
            } else {
                forms.appliesToCategoryCode = undefined;
            }

            // 適用決済カード区分を保管
            if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
            } else {
                forms.appliesToMovieTicket = undefined;
            }

            // 適用上映方式を保管
            if (typeof req.body.appliesToVideoFormat === 'string' && req.body.appliesToVideoFormat.length > 0) {
                forms.appliesToVideoFormat = JSON.parse(req.body.appliesToVideoFormat);
            } else {
                forms.appliesToVideoFormat = undefined;
            }
        }

        res.render('priceSpecifications/new', {
            message: message,
            errors: errors,
            forms: forms,
            PriceSpecificationType: chevre.factory.priceSpecificationType,
            priceSpecificationTypes: priceSpecificationTypes,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier
        });
    }
);

type ICategoryCodeChargeSpecification
    = chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification>;
type IMovieTicketTypeChargeSpecification
    = chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification>;

// tslint:disable-next-line:use-default-type-parameter
priceSpecificationsRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const priceSpecificationService = new chevre.service.PriceSpecification({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            let priceSpecification = await priceSpecificationService.findById({
                id: req.params.id
            });

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    // コンテンツDB登録
                    try {
                        priceSpecification = { ...await createFromBody(req, false), id: priceSpecification.id };
                        await priceSpecificationService.update(priceSpecification);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                ...priceSpecification,
                ...req.body
            };

            if (req.method === 'POST') {
                // 適用区分を保管
                if (typeof req.body.appliesToCategoryCode === 'string' && req.body.appliesToCategoryCode.length > 0) {
                    forms.appliesToCategoryCode = JSON.parse(req.body.appliesToCategoryCode);
                } else {
                    forms.appliesToCategoryCode = undefined;
                }

                // 適用決済カード区分を保管
                if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                    forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
                } else {
                    forms.appliesToMovieTicket = undefined;
                }

                // 適用上映方式を保管
                if (typeof req.body.appliesToVideoFormat === 'string' && req.body.appliesToVideoFormat.length > 0) {
                    forms.appliesToVideoFormat = JSON.parse(req.body.appliesToVideoFormat);
                } else {
                    forms.appliesToVideoFormat = undefined;
                }
            } else {
                if (Array.isArray((<ICategoryCodeChargeSpecification>priceSpecification).appliesToCategoryCode)
                    && (<ICategoryCodeChargeSpecification>priceSpecification).appliesToCategoryCode.length > 0) {
                    const searchAppliesToCategoryCodesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: {
                            identifier: {
                                $in: [
                                    chevre.factory.categoryCode.CategorySetIdentifier.SeatingType,
                                    chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType,
                                    chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType,
                                    chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType
                                ]
                            }
                        },
                        codeValue: { $eq: (<ICategoryCodeChargeSpecification>priceSpecification).appliesToCategoryCode[0].codeValue }
                    });
                    forms.appliesToCategoryCode = searchAppliesToCategoryCodesResult.data[0];
                } else {
                    forms.appliesToCategoryCode = undefined;
                }

                if (typeof (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToMovieTicket?.serviceType === 'string'
                    && typeof (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToMovieTicket?.serviceOutput?.typeOf === 'string') {
                    const searchAppliesToMovieTicketsResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: {
                            identifier: {
                                $in: [
                                    chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType
                                ]
                            }
                        },
                        codeValue: {
                            $eq: (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToMovieTicket?.serviceType
                        },
                        paymentMethod: {
                            typeOf: {
                                $eq: (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToMovieTicket?.serviceOutput?.typeOf
                            }
                        }
                    });
                    forms.appliesToMovieTicket = searchAppliesToMovieTicketsResult.data[0];
                } else {
                    forms.appliesToMovieTicket = undefined;
                }

                if (typeof (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToVideoFormat === 'string'
                    && (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToVideoFormat.length > 0) {
                    const searchAppliesToVideoFormatsResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: {
                            identifier: {
                                $in: [
                                    chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType
                                ]
                            }
                        },
                        codeValue: { $eq: (<IMovieTicketTypeChargeSpecification>priceSpecification).appliesToVideoFormat }
                    });
                    forms.appliesToVideoFormat = searchAppliesToVideoFormatsResult.data[0];
                } else {
                    forms.appliesToVideoFormat = undefined;
                }
            }

            res.render('priceSpecifications/update', {
                message: message,
                errors: errors,
                forms: forms,
                PriceSpecificationType: chevre.factory.priceSpecificationType,
                priceSpecificationTypes: priceSpecificationTypes,
                CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier
            });
        } catch (error) {
            next(error);
        }
    }
);

priceSpecificationsRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const priceSpecificationService = new chevre.service.PriceSpecification({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // validation
            const priceSpecification = await priceSpecificationService.findById({ id: req.params.id });
            await preDelete(req, priceSpecification);

            await priceSpecificationService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(__: Request, __2: chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType>) {
    // validation
}

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createFromBody(
    req: Request, isNew: boolean
): Promise<chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType> & chevre.service.IUnset> {
    let appliesToCategoryCode: chevre.factory.categoryCode.ICategoryCode | undefined;
    let appliesToVideoFormat: string | undefined;
    let appliesToMovieTicketType: string | undefined;
    let appliesToMovieTicketServiceOutputTypeOf: string | undefined;

    switch (req.body.typeOf) {
        case chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification:
            appliesToCategoryCode =
                (typeof req.body.appliesToCategoryCode === 'string' && req.body.appliesToCategoryCode.length > 0)
                    ? JSON.parse(req.body.appliesToCategoryCode)
                    : undefined;
            appliesToVideoFormat = undefined;

            break;

        case chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification:
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const selectedMovieTicketType = JSON.parse(req.body.appliesToMovieTicket);

            const searchMovieTicketTypesResult = await categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } },
                codeValue: { $eq: selectedMovieTicketType.codeValue },
                paymentMethod: { typeOf: { $eq: selectedMovieTicketType.paymentMethod?.typeOf } }
            });
            const movieTicketTypeCharge = searchMovieTicketTypesResult.data.shift();
            if (movieTicketTypeCharge === undefined) {
                throw new Error('適用決済カード区分が見つかりません');
            }
            appliesToMovieTicketType = movieTicketTypeCharge.codeValue;
            appliesToMovieTicketServiceOutputTypeOf = movieTicketTypeCharge.paymentMethod?.typeOf;
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

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: req.body.typeOf,
        price: Number(req.body.price),
        priceCurrency: chevre.factory.priceCurrency.JPY,
        name: req.body.name,
        valueAddedTaxIncluded: true,
        ...(appliesToCategoryCode !== undefined)
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
            : undefined,
        ...(typeof appliesToVideoFormat === 'string' && appliesToVideoFormat.length > 0)
            ? { appliesToVideoFormat }
            : undefined,
        ...(typeof appliesToMovieTicketType === 'string' && appliesToMovieTicketType.length > 0
            && typeof appliesToMovieTicketServiceOutputTypeOf === 'string' && appliesToMovieTicketServiceOutputTypeOf.length > 0)
            ? {
                appliesToMovieTicket: {
                    typeOf: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                    serviceType: appliesToMovieTicketType,
                    serviceOutput: {
                        typeOf: appliesToMovieTicketServiceOutputTypeOf
                    }
                }
            }
            : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(appliesToCategoryCode === undefined)
                        ? { appliesToCategoryCode: 1 }
                        : undefined,
                    ...(appliesToVideoFormat === undefined)
                        ? { appliesToVideoFormat: 1 }
                        : undefined,
                    ...(typeof appliesToMovieTicketType !== 'string' || appliesToMovieTicketType.length === 0)
                        ? { appliesToMovieTicketType: 1, appliesToMovieTicket: 1 }
                        : undefined
                }
            } : undefined
    };
}

function validate() {
    return [
        body('typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '価格仕様タイプ')),

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30)),

        body('price')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '金額'))
            .isInt()
            .withMessage(() => '数値を入力してください')
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('appliesToCategoryCode')
            .if((_: any, { req }: Meta) => req.body.typeOf === chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用区分')),

        body('appliesToMovieTicket')
            .if((_: any, { req }: Meta) => req.body.typeOf === chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用決済カード区分')),

        body('appliesToVideoFormat')
            .if((_: any, { req }: Meta) => req.body.typeOf === chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用上映方式区分'))
    ];

}

export { priceSpecificationsRouter };
