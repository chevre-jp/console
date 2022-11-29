/**
 * 追加特性名称ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { additionalPropertyNameCategoryCodeSet } from '../factory/additionalPropertyNameCategoryCodeSet';
import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';

import { validateCsrfToken } from '../middlewares/validateCsrfToken';

type IAdditionalPropertyName = Pick<chevre.factory.categoryCode.ICategoryCode, 'id' | 'typeOf' | 'project' | 'codeValue' | 'inCodeSet' | 'name'>;

// const DEFAULT_ADDITIONAL_PROPERTY_NAMES: string[] = (typeof process.env.DEFAULT_ADDITIONAL_PROPERTY_NAMES === 'string')
//     ? process.env.DEFAULT_ADDITIONAL_PROPERTY_NAMES.split(',')
//     : [];

const additionalPropertyNamesRouter = Router();

additionalPropertyNamesRouter.get(
    '',
    async (_, res) => {
        res.render('additionalPropertyNames/index', {
            message: '',
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: additionalPropertyNameCategoryCodeSet
        });
    }
);

additionalPropertyNamesRouter.get(
    '/categoryCodeSets',
    async (req, res) => {
        if (req.query.format === 'datatable') {
            res.json({
                success: true,
                count: additionalPropertyNameCategoryCodeSet.length,
                results: additionalPropertyNameCategoryCodeSet
            });
        } else {
            res.json(additionalPropertyNameCategoryCodeSet);
        }
    }
);

additionalPropertyNamesRouter.get(
    '/search',
    async (req, res) => {
        try {
            const categoryCodeService = new chevre.service.AdditionalPropertyName({
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
                }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((d) => {
                    const categoryCodeSet = additionalPropertyNameCategoryCodeSet.find((c) => c.identifier === d.inCodeSet.identifier);

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

// tslint:disable-next-line:use-default-type-parameter
additionalPropertyNamesRouter.all<ParamsDictionary>(
    '/new',
    validateCsrfToken,
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};
        let csrfToken: string | undefined;

        const categoryCodeService = new chevre.service.AdditionalPropertyName({
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
                        // その他はグローバルユニークを考慮
                        default:
                            const searchCategoryCodesGloballyResult = await categoryCodeService.search({
                                limit: 1,
                                project: { id: { $eq: req.project.id } },
                                codeValue: { $eq: categoryCode.codeValue }
                            });
                            if (searchCategoryCodesGloballyResult.data.length > 0) {
                                throw new Error('既に存在するコードです');
                            }
                    }

                    categoryCode = await categoryCodeService.create(categoryCode);

                    // tslint:disable-next-line:no-dynamic-delete
                    delete (<Express.Session>req.session).csrfSecret;
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/additionalPropertyNames/${categoryCode.id}/update`);

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
            appliesToCategoryCode: {},
            ...(typeof csrfToken === 'string') ? { csrfToken } : undefined,
            ...req.body
        };

        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            } else {
                forms.inCodeSet = undefined;
            }
        }

        res.render('additionalPropertyNames/new', {
            message: message,
            errors: errors,
            forms: forms,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: additionalPropertyNameCategoryCodeSet
        });
    }
);

additionalPropertyNamesRouter.get(
    '/:id/image',
    (__, res) => {
        res.status(NO_CONTENT)
            .end();
    }
);

// tslint:disable-next-line:use-default-type-parameter
additionalPropertyNamesRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const categoryCodeService = new chevre.service.AdditionalPropertyName({
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
                    categoryCode = { ...createCategoryCodeFromBody(req, false), id: String(categoryCode.id) };
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
            ...categoryCode,
            ...{
                inCodeSet: additionalPropertyNameCategoryCodeSet.find((s) => s.identifier === categoryCode.inCodeSet.identifier)
            },
            ...req.body
        };

        if (req.method === 'POST') {
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            } else {
                forms.inCodeSet = undefined;
            }
        }

        res.render('additionalPropertyNames/update', {
            message: message,
            errors: errors,
            forms: forms,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: additionalPropertyNameCategoryCodeSet
        });
    }
);

additionalPropertyNamesRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            // const eventService = new chevre.service.Event({
            //     endpoint: <string>process.env.API_ENDPOINT,
            //     auth: req.user.authClient
            // });
            const categoryCodeService = new chevre.service.AdditionalPropertyName({
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
async function preDelete(__: Request, categoryCode: IAdditionalPropertyName) {
    // tslint:disable-next-line:no-suspicious-comment
    // TODO validation

    switch (categoryCode.inCodeSet.identifier) {
        default:
        // no op
    }
}

function createCategoryCodeFromBody(req: Request, isNew: boolean): IAdditionalPropertyName & chevre.service.IUnset {
    const inCodeSet = JSON.parse(req.body.inCodeSet);

    // const nameEn = req.body.name?.en;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: 'CategoryCode',
        codeValue: req.body.codeValue,
        inCodeSet: {
            typeOf: 'CategoryCodeSet',
            identifier: inCodeSet.identifier
        },
        name: {
            ja: req.body.codeValue
            // ja: req.body.name.ja,
            // ...(typeof nameEn === 'string' && nameEn.length > 0) ? { en: nameEn } : undefined
        },
        ...(!isNew)
            ? {
                $unset: {}
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
            .matches(/^[a-zA-Z]+$/)
            .withMessage(() => 'アルファベットで入力してください')
            .isLength({ min: 8, max: 20 })
            .withMessage('8~20文字で入力してください')
            // 予約語除外
            .not()
            .isIn(RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません')
    ];
}

export { additionalPropertyNamesRouter };
