/**
 * 返品ポリシールーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';

const NUM_ADDITIONAL_PROPERTY = 10;

const merchantReturnPoliciesRouter = Router();

merchantReturnPoliciesRouter.get(
    '',
    async (_, res) => {
        res.render('merchantReturnPolicies/index', {
            message: ''
        });
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
                sort: { identifier: chevre.factory.sortType.Ascending }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((m) => {
                    return {
                        ...m
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

                    // tslint:disable-next-line:no-suspicious-comment
                    // TODO コード重複確認

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
            forms: forms
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
            forms: forms
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

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function preDelete(__: Request, __2: chevre.factory.offer.IOfferMerchantReturnPolicy) {
    // validate
}

function createReturnPolicyFromBody(req: Request, isNew: boolean): chevre.factory.offer.IOfferMerchantReturnPolicy {
    const nameEn = req.body.name?.en;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: 'MerchantReturnPolicy',
        identifier: req.body.identifier,
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
            .withMessage(Message.Common.getMaxLength('英語名称', 30))
    ];
}

export { merchantReturnPoliciesRouter };
