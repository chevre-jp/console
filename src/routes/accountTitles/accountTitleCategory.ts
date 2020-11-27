/**
 * 科目分類管理ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';
import * as _ from 'underscore';

import * as Message from '../../message';

const debug = createDebug('chevre-backend:routes');

const NAME_MAX_LENGTH_CODE: number = 30;
const NAME_MAX_LENGTH_NAME_JA: number = 64;

const accountTitleCategoryRouter = Router();

accountTitleCategoryRouter.get(
    '',
    async (req, res) => {
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        if (req.xhr) {
            try {
                debug('searching accountTitleCategories...', req.query);
                const limit = Number(req.query.limit);
                const page = Number(req.query.page);
                const { data } = await accountTitleService.searchAccountTitleCategories({
                    limit: limit,
                    page: page,
                    project: { ids: [req.project.id] },
                    codeValue: (req.query.codeValue !== undefined && req.query.codeValue !== '') ? `${req.query.codeValue}` : undefined,
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
            res.render('accountTitles/accountTitleCategory/index', {
                forms: {}
            });
        }
    }
);

accountTitleCategoryRouter.all<any>(
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
                    const accountTitleCategory = createFromBody(req, true);
                    debug('saving account title...', accountTitleCategory);
                    const accountTitleService = new chevre.service.AccountTitle({
                        endpoint: <string>process.env.API_ENDPOINT,
                        auth: req.user.authClient
                    });
                    await accountTitleService.createAccounTitleCategory(accountTitleCategory);
                    req.flash('message', '登録しました');
                    res.redirect(`/accountTitles/accountTitleCategory/${accountTitleCategory.codeValue}`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            ...req.body
        };

        res.render('accountTitles/accountTitleCategory/add', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
accountTitleCategoryRouter.all<ParamsDictionary>(
    '/:codeValue',
    ...validate(),
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const accountTitleService = new chevre.service.AccountTitle({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const searchAccountTitlesResult = await accountTitleService.searchAccountTitleCategories({
                project: { ids: [req.project.id] },
                codeValue: { $eq: req.params.codeValue }
            });
            let accountTitleCategory = searchAccountTitlesResult.data.shift();
            if (accountTitleCategory === undefined) {
                throw new chevre.factory.errors.NotFound('AccounTitle');
            }

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    // コンテンツDB登録
                    try {
                        accountTitleCategory = createFromBody(req, false);
                        debug('saving account title...', accountTitleCategory);
                        await accountTitleService.updateAccounTitleCategory(accountTitleCategory);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            } else if (req.method === 'DELETE') {
                try {
                    await preDelete(req, accountTitleCategory);

                    await accountTitleService.deleteAccounTitleCategory({
                        project: { id: req.project.id },
                        codeValue: accountTitleCategory.codeValue
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
                ...accountTitleCategory,
                ...req.body
            };

            res.render('accountTitles/accountTitleCategory/edit', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

async function preDelete(req: Request, accountTitleCategory: chevre.factory.accountTitle.IAccountTitle) {
    // validation
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const offerService = new chevre.service.Offer({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
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
            project: { ids: [req.project.id] },
            inCodeSet: {
                inCodeSet: {
                    codeValue: { $eq: accountTitleCategory.codeValue }
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

function createFromBody(req: Request, isNew: boolean): chevre.factory.accountTitle.IAccountTitle {
    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: <'AccountTitle'>'AccountTitle',
        codeValue: req.body.codeValue,
        name: req.body.name,
        // description: req.body.description,
        // inDefinedTermSet: req.body.inDefinedTermSet
        ...(isNew)
            ? { hasCategoryCode: [] }
            : undefined
    };
}

/**
 * 科目分類検証
 */
function validate() {
    return [
        body('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .isLength({ max: NAME_MAX_LENGTH_CODE })
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', NAME_MAX_LENGTH_CODE))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage(() => '英数字で入力してください'),

        body('name')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA))
    ];
}

export default accountTitleCategoryRouter;
