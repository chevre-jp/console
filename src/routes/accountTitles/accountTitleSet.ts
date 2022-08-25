/**
 * 科目管理ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../../factory/reservedCodeValues';
import * as Message from '../../message';

const NUM_ADDITIONAL_PROPERTY = 5;
const NAME_MAX_LENGTH_NAME_JA: number = 64;

const accountTitleSetRouter = Router();

accountTitleSetRouter.get(
    '',
    async (req, res) => {
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.xhr) {
            try {
                const limit = Number(req.query.limit);
                const page = Number(req.query.page);
                const { data } = await accountTitleService.searchAccountTitleSets({
                    limit: limit,
                    page: page,
                    project: { id: { $eq: req.project.id } },
                    codeValue: (typeof req.query.codeValue === 'string' && req.query.codeValue.length > 0)
                        ? req.query.codeValue
                        : undefined,
                    inCodeSet: {
                        codeValue: (typeof req.query.inCodeSet?.codeValue === 'string' && req.query.inCodeSet.codeValue.length > 0)
                            ? { $eq: req.query.inCodeSet.codeValue }
                            : undefined
                    },
                    name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
                });

                res.json({
                    success: true,
                    count: (data.length === Number(limit))
                        ? (Number(page) * Number(limit)) + 1
                        : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                    results: data
                });
            } catch (error) {
                res.json({
                    success: false,
                    count: 0,
                    results: []
                });
            }
        } else {
            res.render('accountTitles/accountTitleSet/index', {
            });
        }

    }
);

// tslint:disable-next-line:use-default-type-parameter
accountTitleSetRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const accountTitleService = new chevre.service.AccountTitle({
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
                    const accountTitleSet = await createFromBody(req, true);
                    await accountTitleService.createAccounTitleSet(accountTitleSet);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/accountTitles/accountTitleSet/${accountTitleSet.codeValue}`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            } else {
                forms.inCodeSet = undefined;
            }
        }

        res.render('accountTitles/accountTitleSet/add', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
accountTitleSetRouter.all<ParamsDictionary>(
    '/:codeValue',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        const searchAccountTitleSetsResult = await accountTitleService.searchAccountTitleSets({
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: req.params.codeValue }
        });
        let accountTitleSet = searchAccountTitleSetsResult.data.shift();
        if (accountTitleSet === undefined) {
            throw new chevre.factory.errors.NotFound('AccounTitle');
        }

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    accountTitleSet = await createFromBody(req, false);
                    await accountTitleService.updateAccounTitleSet(accountTitleSet);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        } else if (req.method === 'DELETE') {
            try {
                await preDelete(req, accountTitleSet);

                await accountTitleService.deleteAccounTitleSet({
                    // project: { id: req.project.id },
                    codeValue: accountTitleSet.codeValue,
                    inCodeSet: {
                        codeValue: String(accountTitleSet.inCodeSet?.codeValue)
                    }
                });

                res.status(NO_CONTENT)
                    .end();

            } catch (error) {
                res.status(BAD_REQUEST)
                    .json({ error: { message: error.message } });
            }

            return;
        }

        const forms = {
            additionalProperty: [],
            ...accountTitleSet,
            ...req.body
        };
        if (!Array.isArray(forms.additionalProperty)) {
            forms.additionalProperty = [];
        }
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            } else {
                forms.inCodeSet = undefined;
            }
        }

        res.render('accountTitles/accountTitleSet/edit', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

async function preDelete(req: Request, accountTitleSet: chevre.factory.accountTitle.IAccountTitle) {
    // validation
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const offerService = new chevre.service.Offer({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // 科目に属する全細目
    const limit = 100;
    let page = 0;
    let numData: number = limit;
    const accountTitles: chevre.factory.accountTitle.IAccountTitle[] = [];
    while (numData === limit) {
        page += 1;
        const searchAccountTitlesResult = await accountTitleService.search({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            inCodeSet: {
                codeValue: { $eq: accountTitleSet.codeValue },
                inCodeSet: {
                    codeValue: { $eq: accountTitleSet.inCodeSet?.codeValue }
                }
            }
        });
        numData = searchAccountTitlesResult.data.length;
        accountTitles.push(...searchAccountTitlesResult.data);
    }

    const searchOffersPer = 10;
    if (accountTitles.length > 0) {
        // 関連するオファーを10件ずつ確認する(queryの長さは有限なので)
        // tslint:disable-next-line:no-magic-numbers
        const searchCount = Math.ceil(accountTitles.length / searchOffersPer);

        // tslint:disable-next-line:prefer-array-literal
        const searchNubmers = [...Array(searchCount)].map((__, i) => i);

        for (const i of searchNubmers) {
            const start = i * searchOffersPer;
            const end = Math.min(start + searchOffersPer - 1, accountTitles.length);

            const searchOffersResult = await offerService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                priceSpecification: {
                    accounting: {
                        operatingRevenue: {
                            codeValue: {
                                $in: accountTitles.slice(start, end)
                                    .map((a) => a.codeValue)
                            }
                        }
                    }
                }
            });
            if (searchOffersResult.data.length > 0) {
                throw new Error('関連するオファーが存在します');
            }
        }
    }
}

async function createFromBody(req: Request, isNew: boolean): Promise<chevre.factory.accountTitle.IAccountTitle> {
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // 科目分類検索
    let accountTitleCategory: chevre.factory.accountTitle.IAccountTitle | undefined;
    if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
        const selectedAccountTitleCategory = JSON.parse(req.body.inCodeSet);
        const searchAccountTitleCategoriesResult = await accountTitleService.searchAccountTitleCategories({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: selectedAccountTitleCategory.codeValue }
        });
        accountTitleCategory = searchAccountTitleCategoriesResult.data.shift();
    }
    if (accountTitleCategory === undefined) {
        throw new Error('科目分類が見つかりません');
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: <'AccountTitle'>'AccountTitle',
        codeValue: req.body.codeValue,
        name: req.body.name,
        hasCategoryCode: [],
        inCodeSet: accountTitleCategory,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        // inDefinedTermSet: req.body.inDefinedTermSet
        ...(isNew)
            ? { hasCategoryCode: [] }
            : undefined
    };
}

/**
 * 科目バリデーション
 */
function validate() {
    return [
        body('inCodeSet')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '科目分類')),

        body('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .isLength({ min: 2, max: 12 })
            .withMessage('2~12文字で入力してください')
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage(() => '英数字で入力してください')
            // 予約語除外
            .not()
            .isIn(RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),

        body('name')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA))
    ];
}

export default accountTitleSetRouter;
