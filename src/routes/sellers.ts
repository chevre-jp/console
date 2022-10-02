/**
 * 販売者ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';
import * as Message from '../message';

const NUM_ADDITIONAL_PROPERTY = 10;
const NUM_RETURN_POLICY = 1;
const NAME_MAX_LENGTH_NAME = 64;

const sellersRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
sellersRouter.all<ParamsDictionary>(
    '/new',
    ...validate(true),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const sellerService = new chevre.service.Seller({
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
                    let seller = await createFromBody(req, true);

                    seller = await sellerService.create(seller);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/sellers/${seller.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            hasMerchantReturnPolicy: [],
            paymentAccepted: [],
            name: {},
            alternateName: {},
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.hasMerchantReturnPolicy.length < NUM_RETURN_POLICY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.hasMerchantReturnPolicy.push(...[...Array(NUM_RETURN_POLICY - forms.hasMerchantReturnPolicy.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // 対応決済方法を補完
            if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
                forms.paymentAccepted = (<string[]>req.body.paymentAccepted).map((v) => JSON.parse(v));
            } else {
                forms.paymentAccepted = [];
            }
        }

        res.render('sellers/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

sellersRouter.get(
    '/getlist',
    async (req, res) => {
        try {
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);

            const searchConditions: chevre.factory.seller.ISearchConditions = {
                limit: limit,
                page: page,
                sort: { branchCode: chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                branchCode: {
                    $regex: (typeof req.query.branchCode?.$regex === 'string' && req.query.branchCode.$regex.length > 0)
                        ? req.query.branchCode.$regex
                        : undefined
                },
                name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
            };

            let data: chevre.factory.seller.ISeller[];
            const searchResult = await sellerService.search(searchConditions);
            data = searchResult.data;

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((t) => {
                    return {
                        ...t,
                        paymentAcceptedCount: (Array.isArray(t.paymentAccepted))
                            ? t.paymentAccepted.length
                            : 0,
                        hasMerchantReturnPolicyCount: (Array.isArray(t.hasMerchantReturnPolicy))
                            ? t.hasMerchantReturnPolicy.length
                            : 0
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

sellersRouter.get(
    '/:id',
    async (req, res) => {
        try {
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const seller = await sellerService.findById({ id: String(req.params.id) });

            res.json(seller);
        } catch (err) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message
                });
        }
    }
);

sellersRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const seller = await sellerService.findById({ id: req.params.id });
            await preDelete(req, seller);

            await sellerService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(req: Request, seller: chevre.factory.seller.ISeller) {
    // 施設が存在するかどうか
    const placeService = new chevre.service.Place({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchMovieTheatersResult = await placeService.searchMovieTheaters({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        parentOrganization: { id: { $eq: seller.id } }
    });
    if (searchMovieTheatersResult.data.length > 0) {
        throw new Error('関連する施設が存在します');
    }
}

// tslint:disable-next-line:use-default-type-parameter
sellersRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(false),
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            let seller = await sellerService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        req.body.id = req.params.id;
                        seller = await createFromBody(req, false);
                        await sellerService.update({ id: String(seller.id), attributes: seller });
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                paymentAccepted: [],
                hasMerchantReturnPolicy: [],
                ...seller,
                ...req.body
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }
            if (forms.hasMerchantReturnPolicy.length < NUM_RETURN_POLICY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.hasMerchantReturnPolicy.push(...[...Array(NUM_RETURN_POLICY - forms.hasMerchantReturnPolicy.length)].map(() => {
                    return {};
                }));
            }

            if (req.method === 'POST') {
                // 対応決済方法を補完
                if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
                    forms.paymentAccepted = (<string[]>req.body.paymentAccepted).map((v) => JSON.parse(v));
                } else {
                    forms.paymentAccepted = [];
                }
            } else {
                if (Array.isArray(seller.paymentAccepted) && seller.paymentAccepted.length > 0) {
                    const searchPaymentMethodTypesResult = await categoryCodeService.search({
                        limit: 100,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } },
                        codeValue: { $in: seller.paymentAccepted.map((v) => v.paymentMethodType) }
                    });
                    forms.paymentAccepted = searchPaymentMethodTypesResult.data.map((c) => {
                        return { codeValue: c.codeValue, name: c.name };
                    });
                } else {
                    forms.paymentAccepted = [];
                }
            }

            res.render('sellers/update', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

sellersRouter.get(
    '',
    async (__, res) => {
        res.render('sellers/index', {
            message: ''
        });
    }
);

// tslint:disable-next-line:cyclomatic-complexity
async function createFromBody(
    req: Request, isNew: boolean
): Promise<chevre.factory.seller.ISeller & chevre.service.IUnset> {
    let nameFromJson: any = {};
    if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
        try {
            nameFromJson = JSON.parse(req.body.nameStr);
        } catch (error) {
            throw new Error(`高度な名称の型が不適切です ${error.message}`);
        }
    }

    let hasMerchantReturnPolicy: chevre.factory.seller.IHasMerchantReturnPolicy | undefined;
    // hasMerchantReturnPolicyの指定があればひとつだけ適用
    if (Array.isArray(req.body.hasMerchantReturnPolicy) && req.body.hasMerchantReturnPolicy.length > 0) {
        const policyFromBody = req.body.hasMerchantReturnPolicy[0];
        const merchantReturnDaysFromBody = policyFromBody.merchantReturnDays;
        const restockingFeeValueFromBody = policyFromBody.restockingFee?.value;
        const policyUrlFromBody = policyFromBody.url;
        if (typeof merchantReturnDaysFromBody === 'number' && typeof restockingFeeValueFromBody === 'number') {
            // 厳密に型をコントロール(2022-08-03~)
            // merchantReturnDays,restockingFeeを要定義
            hasMerchantReturnPolicy = [{
                merchantReturnDays: merchantReturnDaysFromBody,
                restockingFee: {
                    typeOf: 'MonetaryAmount',
                    currency: chevre.factory.priceCurrency.JPY,
                    value: restockingFeeValueFromBody
                },
                typeOf: 'MerchantReturnPolicy',
                ...(typeof policyUrlFromBody === 'string' && policyUrlFromBody.length > 0)
                    ? { url: policyUrlFromBody }
                    : undefined
            }];
        }
    }

    let paymentAccepted: chevre.factory.seller.IPaymentAccepted[] | undefined;
    if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
        try {
            paymentAccepted = (<any[]>req.body.paymentAccepted).map((p) => {
                const selectedPaymentMethod = JSON.parse(p);

                return { paymentMethodType: selectedPaymentMethod.codeValue };
            });
        } catch (error) {
            throw new Error(`対応決済方法の型が不適切です ${error.message}`);
        }
    }

    const branchCode: string = String(req.body.branchCode);
    const telephone: string | undefined = req.body.telephone;
    const url: string | undefined = req.body.url;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.organizationType.Corporation,
        branchCode,
        id: req.body.id,
        name: {
            ...nameFromJson,
            ja: req.body.name.ja,
            en: req.body.name.en
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
        ...(typeof telephone === 'string' && telephone.length > 0) ? { telephone } : undefined,
        ...(typeof url === 'string' && url.length > 0) ? { url } : undefined,
        ...(hasMerchantReturnPolicy !== undefined) ? { hasMerchantReturnPolicy } : undefined,
        ...(paymentAccepted !== undefined) ? { paymentAccepted } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    parentOrganization: 1,
                    ...(typeof telephone !== 'string' || telephone.length === 0) ? { telephone: 1 } : undefined,
                    ...(typeof url !== 'string' || url.length === 0) ? { url: 1 } : undefined,
                    ...(hasMerchantReturnPolicy === undefined) ? { hasMerchantReturnPolicy: 1 } : undefined,
                    ...(paymentAccepted === undefined) ? { paymentAccepted: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate(isNew: boolean) {
    return [
        ...(isNew)
            ? [
                body('branchCode')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .matches(/^[0-9a-zA-Z]+$/)
                    .withMessage('半角英数字で入力してください')
                    .isLength({ min: 3, max: 12 })
                    .withMessage('3~12文字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
            ]
            : [
                body('branchCode')
                    .notEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
                    .matches(/^[0-9a-zA-Z]+$/)
                    .withMessage('半角英数字で入力してください')
                    .isLength({ max: 12 })
                    .withMessage('~12文字で入力してください')
                    // 予約語除外
                    .not()
                    .isIn(RESERVED_CODE_VALUES)
                    .withMessage('予約語のため使用できません')
            ],
        body(['name.ja', 'name.en'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME)),

        body('hasMerchantReturnPolicy')
            .optional()
            .isArray({ min: 0, max: NUM_RETURN_POLICY }),
        body('hasMerchantReturnPolicy.*.merchantReturnDays')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isInt()
            .toInt()
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),
        body('hasMerchantReturnPolicy.*.restockingFee.value')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isInt()
            .toInt()
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')
    ];
}

export { sellersRouter };
