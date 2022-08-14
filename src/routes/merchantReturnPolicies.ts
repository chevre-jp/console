/**
 * 返品ポリシールーター
 */
import { chevre, factory } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';
import { returnFeesEnumerationMovieTicketTypes } from '../factory/returnFeesEnumerationMovieTicketTypes';
import { returnFeesEnumerationTypes } from '../factory/returnFeesEnumerationTypes';

const NUM_ADDITIONAL_PROPERTY = 10;

const merchantReturnPoliciesRouter = Router();

merchantReturnPoliciesRouter.get(
    '',
    async (req, res, next) => {
        try {
            // 販売者に返品ポリシーが設定されているかどうか
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchSellersResult = await sellerService.search({
                limit: 100,
                $projection: {
                    name: 0,
                    paymentAccepted: 0,
                    telephone: 0,
                    url: 0,
                    additionalProperty: 0,
                    branchCode: 0,
                    areaServed: 0,
                    project: 0,
                    typeOf: 0
                }
            });
            const someSellerHasMerchantReturnPolicy = searchSellersResult.data.some((seller) => {
                return Array.isArray(seller.hasMerchantReturnPolicy) && seller.hasMerchantReturnPolicy.length > 0;
            });
            if (!someSellerHasMerchantReturnPolicy) {
                throw new Error('返品手数料の設定された販売者が見つかりません');
            }

            res.render('merchantReturnPolicies/index', {
                message: ''
            });
        } catch (error) {
            next(error);
        }
    }
);

merchantReturnPoliciesRouter.get(
    '/search',
    async (req, res) => {
        try {
            const merchantReturnPolicyService = new chevre.service.MerchantReturnPolicy({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await merchantReturnPolicyService.search({
                limit: limit,
                page: page,
                sort: { identifier: chevre.factory.sortType.Ascending },
                identifier: {
                    $regex: (typeof req.query.identifier?.$regex === 'string' && req.query.identifier.$regex.length > 0)
                        ? req.query.identifier.$regex
                        : undefined
                },
                name: {
                    $regex: (typeof req.query.name?.$regex === 'string' && req.query.name.$regex.length > 0)
                        ? req.query.name.$regex
                        : undefined
                }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((returnPolicy) => {
                    const customerRemorseReturnFeesStr = returnFeesEnumerationTypes
                        .find((r) => r.codeValue === returnPolicy.customerRemorseReturnFees)?.name;
                    const customerRemorseReturnFeesMovieTicketStr = returnFeesEnumerationMovieTicketTypes
                        .find((r) => r.codeValue === returnPolicy.customerRemorseReturnFeesMovieTicket)?.name;

                    return {
                        ...returnPolicy,
                        customerRemorseReturnFeesStr,
                        customerRemorseReturnFeesMovieTicketStr
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
merchantReturnPoliciesRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const merchantReturnPolicyService = new chevre.service.MerchantReturnPolicy({
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
                    let returnPolicy = createReturnPolicyFromBody(req, true);

                    // コード重複確認
                    const searchPoliciesResult = await merchantReturnPolicyService.search({
                        identifier: { $eq: returnPolicy.identifier }
                    });
                    if (searchPoliciesResult.data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    returnPolicy = await merchantReturnPolicyService.create(returnPolicy);

                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/merchantReturnPolicies/${returnPolicy.id}/update`);

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

        if (req.method === 'POST') {
            // no op
        }

        res.render('merchantReturnPolicies/new', {
            message: message,
            errors: errors,
            forms: forms,
            returnFeesEnumerationMovieTicketTypes,
            returnFeesEnumerationTypes
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
merchantReturnPoliciesRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const merchantReturnPolicyService = new chevre.service.MerchantReturnPolicy({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        let returnPolicy = await merchantReturnPolicyService.findById({
            id: req.params.id
        });

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                // コンテンツDB登録
                try {
                    returnPolicy = { ...createReturnPolicyFromBody(req, false), id: String(returnPolicy.id) };
                    await merchantReturnPolicyService.update(returnPolicy);
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
            ...returnPolicy,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // no op
        }

        res.render('merchantReturnPolicies/update', {
            message: message,
            errors: errors,
            forms: forms,
            returnFeesEnumerationMovieTicketTypes,
            returnFeesEnumerationTypes
        });
    }
);

merchantReturnPoliciesRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const merchantReturnPolicyService = new chevre.service.MerchantReturnPolicy({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const returnPolicy = await merchantReturnPolicyService.findById({ id: req.params.id });
            await preDelete(req, returnPolicy);

            await merchantReturnPolicyService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

merchantReturnPoliciesRouter.get(
    '/howApplicated',
    async (_, res) => {
        res.render('merchantReturnPolicies/howApplicated', {});
    }
);

async function preDelete(req: Request, returnPolicy: chevre.factory.offer.IOfferMerchantReturnPolicy) {
    const offerService = new chevre.service.Offer({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchOffersResult = await offerService.search({
        limit: 1,
        hasMerchantReturnPolicy: { id: { $eq: String(returnPolicy.id) } }
    });
    if (searchOffersResult.data.length > 0) {
        throw new Error('関連するオファーが存在します');
    }
}

function createReturnPolicyFromBody(req: Request, isNew: boolean): chevre.factory.offer.IOfferMerchantReturnPolicy {
    const nameEn = req.body.name?.en;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: 'MerchantReturnPolicy',
        identifier: req.body.identifier,
        customerRemorseReturnFees: <factory.merchantReturnPolicy.ReturnFeesEnumeration>
            String(req.body.customerRemorseReturnFees),
        customerRemorseReturnFeesMovieTicket: <factory.merchantReturnPolicy.ReturnFeesEnumeration>
            String(req.body.customerRemorseReturnFeesMovieTicket),
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
        ...(!isNew)
            ? {
                // $unset: {
                //     ...(typeof image !== 'string') ? { image: 1 } : undefined,
                //     ...(typeof color !== 'string') ? { color: 1 } : undefined
                // }
            }
            : undefined
    };
}

function validate() {
    return [
        body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 20 })
            .withMessage('3~20文字で入力してください')
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
        body('customerRemorseReturnFees')
            .not()
            .isEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '返品手数料タイプ'))
            .isIn([
                chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn,
                chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.RestockingFees,
                chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility
            ])
            .withMessage('不適切な値です'),
        body('customerRemorseReturnFeesMovieTicket')
            .not()
            .isEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '決済カード着券取消タイプ'))
            .isIn([
                chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn,
                chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility
            ])
            .withMessage('不適切な値です')
    ];
}

export { merchantReturnPoliciesRouter };
