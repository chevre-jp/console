/**
 * 顧客ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';
import * as Message from '../message';

const NUM_CONTACT_POINT = 5;
const NUM_ADDITIONAL_PROPERTY = 10;

const customersRouter = Router();

customersRouter.get(
    '',
    async (__, res) => {
        res.render('customers/index', {
            message: ''
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
customersRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const customerService = new chevre.service.Customer({
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
                    let customer = await createFromBody(req, true);

                    const { data } = await customerService.search({
                        limit: 1,
                        branchCode: { $regex: `^${customer.branchCode}$` }
                    });
                    if (data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    customer = await customerService.create(customer);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/customers/${customer.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            } else {
                message = '入力項目をご確認ください';
            }
        }

        const forms = {
            additionalProperty: [],
            contactPoint: [],
            name: {},
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.contactPoint.length < NUM_CONTACT_POINT) {
            // tslint:disable-next-line:prefer-array-literal
            forms.contactPoint.push(...[...Array(NUM_CONTACT_POINT - forms.contactPoint.length)].map(() => {
                return {};
            }));
        }

        res.render('customers/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

customersRouter.get(
    '/getlist',
    async (req, res) => {
        try {
            const customerService = new chevre.service.Customer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);

            const searchConditions: chevre.factory.customer.ISearchConditions = {
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                branchCode: (typeof req.query.branchCode?.$regex === 'string' && req.query.branchCode.$regex.length > 0)
                    ? { $regex: req.query.branchCode.$regex }
                    : undefined,
                name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? { $regex: req.query.name } : undefined
            };

            let data: chevre.factory.customer.ICustomer[];
            const searchResult = await customerService.search(searchConditions);
            data = searchResult.data;

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((t) => {
                    return {
                        ...t,
                        numContactPoint: (Array.isArray(t.contactPoint)) ? t.contactPoint.length : 0
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

customersRouter.get(
    '/:id',
    async (req, res) => {
        try {
            const customerService = new chevre.service.Customer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const customer = await customerService.findById({ id: String(req.params.id) });

            res.json(customer);
        } catch (err) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message
                });
        }
    }
);

customersRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const customerService = new chevre.service.Customer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const customer = await customerService.findById({ id: req.params.id });
            await preDelete(req, customer);

            await customerService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(__: Request, ___: chevre.factory.customer.ICustomer) {
    // 施設が存在するかどうか
    // const placeService = new chevre.service.Place({
    //     endpoint: <string>process.env.API_ENDPOINT,
    //     auth: req.user.authClient
    // });

    // const searchMovieTheatersResult = await placeService.searchMovieTheaters({
    //     limit: 1,
    //     project: { ids: [req.project.id] },
    //     parentOrganization: { id: { $eq: seller.id } }
    // });
    // if (searchMovieTheatersResult.data.length > 0) {
    //     throw new Error('関連する施設が存在します');
    // }
}

// tslint:disable-next-line:use-default-type-parameter
customersRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const customerService = new chevre.service.Customer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            let customer = await customerService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        req.body.id = req.params.id;
                        customer = await createFromBody(req, false);
                        await customerService.update({ id: String(customer.id), attributes: customer });
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                } else {
                    message = '入力項目をご確認ください';
                }
            }

            const forms = {
                ...customer,
                ...req.body
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }
            if (forms.contactPoint.length < NUM_CONTACT_POINT) {
                // tslint:disable-next-line:prefer-array-literal
                forms.contactPoint.push(...[...Array(NUM_CONTACT_POINT - forms.contactPoint.length)].map(() => {
                    return {};
                }));
            }

            if (req.method === 'POST') {
                // no op
            } else {
                // no op
            }

            res.render('customers/update', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

// tslint:disable-next-line:cyclomatic-complexity
async function createFromBody(
    req: Request, isNew: boolean
): Promise<chevre.factory.customer.ICustomer> {
    let nameFromJson: any = {};
    if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
        try {
            nameFromJson = JSON.parse(req.body.nameStr);
        } catch (error) {
            throw new Error(`高度な名称の型が不適切です ${error.message}`);
        }
    }

    const telephone: string | undefined = req.body.telephone;
    const url: string | undefined = req.body.url;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.organizationType.Organization,
        id: req.body.id,
        branchCode: req.body.branchCode,
        name: {
            ...nameFromJson,
            ja: req.body.name.ja,
            ...(typeof req.body.name?.en === 'string') ? { en: req.body.name.en } : undefined
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
        contactPoint: (Array.isArray(req.body.contactPoint))
            ? req.body.contactPoint.filter((p: any) => (typeof p.name === 'string' && p.name.length > 0)
                || (typeof p.email === 'string' && p.email.length > 0)
                || (typeof p.telephone === 'string' && p.telephone.length > 0))
                .map((p: any) => {
                    return {
                        typeOf: 'ContactPoint',
                        ...(typeof p.name === 'string' && p.name.length > 0) ? { name: p.name } : undefined,
                        ...(typeof p.email === 'string' && p.email.length > 0) ? { email: p.email } : undefined,
                        ...(typeof p.telephone === 'string' && p.telephone.length > 0) ? { telephone: p.telephone } : undefined
                    };
                })
            : [],
        ...(typeof telephone === 'string' && telephone.length > 0) ? { telephone } : undefined,
        ...(typeof url === 'string' && url.length > 0) ? { url } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(typeof telephone !== 'string' || telephone.length === 0) ? { telephone: 1 } : undefined,
                    ...(typeof url !== 'string' || url.length === 0) ? { url: 1 } : undefined
                }
            }
            : undefined
    };
}

// tslint:disable-next-line:max-func-body-length
function validate() {
    return [
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
            .withMessage('予約語のため使用できません'),

        body(['name.ja'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),

        body('contactPoint.*.email')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isEmail()
            .withMessage('メールアドレスの形式が不適切です')
            .isLength({ max: 128 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('メールアドレス', 128)),

        body('contactPoint.*.telephone')
            .optional()
            .if((value: any) => String(value).length > 0)
            .custom((value) => {
                // 電話番号バリデーション
                try {
                    const phoneUtil = PhoneNumberUtil.getInstance();
                    // const phoneNumber = phoneUtil.parse(telephone, params.agent.telephoneRegion);
                    const phoneNumber = phoneUtil.parse(value);
                    if (!phoneUtil.isValidNumber(phoneNumber)) {
                        throw new Error('Invalid phone number');
                    }
                } catch (error) {
                    throw new Error('E.164形式で入力してください');
                }

                return true;
            })
            .customSanitizer((value) => {
                // 電話番号バリデーション
                let formattedTelephone: string = value;
                try {
                    const phoneUtil = PhoneNumberUtil.getInstance();
                    // const phoneNumber = phoneUtil.parse(telephone, params.agent.telephoneRegion);
                    const phoneNumber = phoneUtil.parse(value);
                    // if (!phoneUtil.isValidNumber(phoneNumber)) {
                    //     throw new Error('Invalid phone number');
                    // }
                    formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
                    // value = formattedTelephone;
                } catch (error) {
                    // no op
                }

                return formattedTelephone;
            })
            .isLength({ max: 128 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('電話番号', 128))

        // body('contactPoint')
        //     .optional()
        //     .isArray()
        //     .custom((value) => {
        //         // 電話番号バリデーション
        //         // const telephones = (<any[]>value)
        //         //     .filter((p) => String(p.telephone).length > 0)
        //         //     .map((p) => String(p.telephone));

        //         (<any[]>value).forEach((p) => {
        //             const telephone = String(p.telephone);
        //             if (telephone.length > 0) {
        //                 let formattedTelephone: string;
        //                 try {
        //                     const phoneUtil = PhoneNumberUtil.getInstance();
        //                     // const phoneNumber = phoneUtil.parse(telephone, params.agent.telephoneRegion);
        //                     const phoneNumber = phoneUtil.parse(telephone);
        //                     if (!phoneUtil.isValidNumber(phoneNumber)) {
        //                         throw new Error('Invalid phone number');
        //                     }
        //                     formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
        //                     p.telephone = formattedTelephone;
        //                 } catch (error) {
        //                     throw new Error('電話番号のフォーマットを確認してください');
        //                 }
        //             }
        //         });

        //         return true;
        //     })
    ];
}

export default customersRouter;
