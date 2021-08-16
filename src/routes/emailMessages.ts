/**
 * Eメールメッセージルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';

import * as Message from '../message';

import { emailMessageAboutIdentifier } from '../factory/emailMessageAboutIdentifier';

const emailMessagesRouter = Router();

emailMessagesRouter.get(
    '',
    async (__, res) => {
        res.render('emailMessages/index', {
            message: ''
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
emailMessagesRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const emailMessageService = new chevre.service.EmailMessage({
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
                    let emailMessage = await createFromBody(req, true);

                    const { data } = await emailMessageService.search({
                        limit: 1,
                        identifier: { $eq: String(emailMessage.identifier) }
                    });
                    if (data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    emailMessage = await emailMessageService.create(emailMessage);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/emailMessages/${emailMessage.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            } else {
                message = '入力項目をご確認ください';
            }
        }

        const forms = {
            about: {},
            sender: {},
            ...req.body
        };

        if (req.method === 'POST') {
            // 送信タイミングを保管
            if (typeof req.body.aboutIdentifier === 'string' && req.body.aboutIdentifier.length > 0) {
                forms.aboutIdentifier = JSON.parse(req.body.aboutIdentifier);
            } else {
                forms.aboutIdentifier = undefined;
            }
        }

        res.render('emailMessages/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

emailMessagesRouter.get(
    '/getlist',
    async (req, res) => {
        try {
            const emailMessageService = new chevre.service.EmailMessage({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);

            const searchConditions: any = {
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                    ? { $eq: req.query.identifier }
                    : undefined
            };

            let data: chevre.factory.creativeWork.message.email.ICreativeWork[];
            const searchResult = await emailMessageService.search(searchConditions);
            data = searchResult.data;

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((t) => {
                    return {
                        ...t
                        // numContactPoint: (Array.isArray(t.contactPoint)) ? t.contactPoint.length : 0
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

emailMessagesRouter.get(
    '/:id',
    async (req, res) => {
        try {
            const emailMessageService = new chevre.service.EmailMessage({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const emailMessage = await emailMessageService.findById({ id: String(req.params.id) });

            res.json(emailMessage);
        } catch (err) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message
                });
        }
    }
);

emailMessagesRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const emailMessageService = new chevre.service.EmailMessage({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const emailMessage = await emailMessageService.findById({ id: req.params.id });
            await preDelete(req, emailMessage);

            await emailMessageService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(__: Request, ___: chevre.factory.creativeWork.message.email.ICreativeWork) {
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
emailMessagesRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const emailMessageService = new chevre.service.EmailMessage({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            let emailMessage = await emailMessageService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        req.body.id = req.params.id;
                        emailMessage = await createFromBody(req, false);
                        await emailMessageService.update({ id: String(emailMessage.id), attributes: emailMessage });
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
                ...emailMessage,
                aboutIdentifier: emailMessageAboutIdentifier.find((s) => s.identifier === emailMessage.about.identifier),
                ...req.body
            };

            if (req.method === 'POST') {
                // 送信タイミングを保管
                if (typeof req.body.aboutIdentifier === 'string' && req.body.aboutIdentifier.length > 0) {
                    forms.aboutIdentifier = JSON.parse(req.body.aboutIdentifier);
                } else {
                    forms.aboutIdentifier = undefined;
                }
            } else {
                // no op
            }

            res.render('emailMessages/update', {
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
): Promise<chevre.factory.creativeWork.message.email.ICreativeWork> {
    let aboutIdentifier: string | undefined;
    try {
        const aboutIdentifierByJson = JSON.parse(req.body.aboutIdentifier);
        aboutIdentifier = aboutIdentifierByJson.identifier;
    } catch (error) {
        // no op
    }
    if (typeof aboutIdentifier !== 'string') {
        throw new Error('送信タイミングを指定してください');
    }

    return {
        ...{
            project: { typeOf: req.project.typeOf, id: req.project.id }
        },
        typeOf: chevre.factory.creativeWorkType.EmailMessage,
        identifier: req.body.identifier,
        about: {
            typeOf: 'Thing',
            identifier: <chevre.factory.creativeWork.message.email.AboutIdentifier>aboutIdentifier,
            name: req.body.about?.name
        },
        sender: {
            name: req.body.sender?.name,
            email: req.body.sender?.email
        },
        toRecipient: <any>{},
        text: req.body.text,
        // name: {
        //     ...nameFromJson,
        //     ja: req.body.name.ja,
        //     ...(typeof req.body.name?.en === 'string') ? { en: req.body.name.en } : undefined
        // },
        // additionalProperty: (Array.isArray(req.body.additionalProperty))
        //     ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
        //         .map((p: any) => {
        //             return {
        //                 name: String(p.name),
        //                 value: String(p.value)
        //             };
        //         })
        //     : undefined,
        // ...(typeof telephone === 'string' && telephone.length > 0) ? { telephone } : undefined,
        // ...(typeof url === 'string' && url.length > 0) ? { url } : undefined,
        ...(!isNew)
            ? {
                id: req.body.id,
                $unset: {
                    // ...(typeof telephone !== 'string' || telephone.length === 0) ? { telephone: 1 } : undefined,
                    // ...(typeof url !== 'string' || url.length === 0) ? { url: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        body('aboutIdentifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '送信タイミング')),

        body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12)),

        body(['about.name'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '件名'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('件名', 64)),

        body(['sender.name'])
            .optional()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('送信者名称', 64)),

        body(['sender.email'])
            .optional()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('送信者アドレス', 64))
    ];
}

export default emailMessagesRouter;
