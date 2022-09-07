/**
 * 勘定科目管理ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';
import * as Message from '../message';

const debug = createDebug('chevre-backend:routes');

const NAME_MAX_LENGTH_NAME_JA: number = 64;

const NUM_ADDITIONAL_PROPERTY = 5;

import { accountTitleCategoryRouter } from './accountTitles/accountTitleCategory';
import { accountTitleSetRouter } from './accountTitles/accountTitleSet';

const accountTitlesRouter = Router();

accountTitlesRouter.use('/accountTitleCategory', accountTitleCategoryRouter);
accountTitlesRouter.use('/accountTitleSet', accountTitleSetRouter);

accountTitlesRouter.get(
    '',
    async (__, res) => {
        res.render('accountTitles/index', {
        });
    }
);

accountTitlesRouter.get(
    '/getlist',
    async (req, res) => {
        try {
            const accountTitleService = new chevre.service.AccountTitle({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            debug('searching...', req.query);
            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await accountTitleService.search({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                codeValue: (typeof req.query.codeValue === 'string' && req.query.codeValue.length > 0)
                    ? req.query.codeValue
                    : undefined,
                inCodeSet: {
                    codeValue: (typeof req.query.inCodeSet?.codeValue === 'string' && req.query.inCodeSet.codeValue.length > 0)
                        ? { $eq: req.query.inCodeSet.codeValue }
                        : undefined,
                    inCodeSet: {
                        codeValue: (typeof req.query.inCodeSet?.inCodeSet?.codeValue === 'string'
                            && req.query.inCodeSet.inCodeSet.codeValue.length > 0)
                            ? { $eq: req.query.inCodeSet.inCodeSet.codeValue }
                            : undefined
                    }
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
                message: error.message,
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
accountTitlesRouter.all<ParamsDictionary>(
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
            // validate(req);
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    const accountTitle = await createFromBody(req);
                    debug('saving account title...', accountTitle);

                    // 細目コード重複確認
                    const searchAccountTitlesResult = await accountTitleService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        codeValue: { $eq: accountTitle.codeValue }
                    });
                    if (searchAccountTitlesResult.data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    await accountTitleService.create(accountTitle);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/accountTitles/${accountTitle.codeValue}`);

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

        res.render('accountTitles/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
accountTitlesRouter.all<ParamsDictionary>(
    '/:codeValue',
    ...validate(),
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const accountTitleService = new chevre.service.AccountTitle({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchAccountTitlesResult = await accountTitleService.search({
                project: { id: { $eq: req.project.id } },
                codeValue: { $eq: req.params.codeValue }
            });
            let accountTitle = searchAccountTitlesResult.data.shift();
            if (accountTitle === undefined) {
                throw new chevre.factory.errors.NotFound('AccounTitle');
            }

            if (req.method === 'POST') {
                // バリデーション
                // validate(req);
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                console.error('errors', errors);
                if (validatorResult.isEmpty()) {
                    // コンテンツDB登録
                    try {
                        accountTitle = await createFromBody(req);
                        debug('saving account title...', accountTitle);
                        await accountTitleService.update(accountTitle);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            } else if (req.method === 'DELETE') {
                try {
                    await preDelete(req, accountTitle);

                    await accountTitleService.deleteByCodeValue({
                        // project: { id: req.project.id },
                        codeValue: accountTitle.codeValue,
                        inCodeSet: {
                            codeValue: String(accountTitle.inCodeSet?.codeValue),
                            inCodeSet: {
                                codeValue: String(accountTitle.inCodeSet?.inCodeSet?.codeValue)
                            }
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
                ...accountTitle,
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

            res.render('accountTitles/edit', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

async function preDelete(req: Request, accountTitle: chevre.factory.accountTitle.IAccountTitle) {
    // validation
    const offerService = new chevre.service.Offer({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // 関連するオファー
    const searchOffersResult = await offerService.search({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        priceSpecification: {
            accounting: {
                operatingRevenue: {
                    codeValue: { $eq: accountTitle.codeValue }
                }
            }
        }
    });
    if (searchOffersResult.data.length > 0) {
        throw new Error('関連するオファーが存在します');
    }
}

async function createFromBody(req: Request): Promise<chevre.factory.accountTitle.IAccountTitle> {
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // 科目検索
    let accountTitleSet: chevre.factory.accountTitle.IAccountTitle | undefined;
    if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
        const selectedAccountTitleSet = JSON.parse(req.body.inCodeSet);
        const searchAccountTitleSetsResult = await accountTitleService.searchAccountTitleSets({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: selectedAccountTitleSet.codeValue }
        });
        accountTitleSet = searchAccountTitleSetsResult.data.shift();
    }
    if (accountTitleSet === undefined) {
        throw new Error('科目が見つかりません');
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: <'AccountTitle'>'AccountTitle',
        codeValue: req.body.codeValue,
        name: req.body.name,
        inCodeSet: accountTitleSet,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined
    };
}

/**
 * 細目バリデーション
 */
function validate() {
    return [
        body('inCodeSet')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '科目')),
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

export { accountTitlesRouter };
