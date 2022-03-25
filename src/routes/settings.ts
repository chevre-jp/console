/**
 * プロジェクトルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
// import * as moment from 'moment-timezone';

import * as Message from '../message';

const NAME_MAX_LENGTH_NAME = 64;

const settingsRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
settingsRouter.all<ParamsDictionary>(
    '',
    ...validate(),
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            let project = await projectService.findById({ id: req.project.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        // req.body.id = req.params.id;
                        project = await createFromBody(req, false);
                        await projectService.update(project);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                ...project,
                ...req.body
            };

            if (req.method === 'POST') {
                // no op
            } else {
                // no op
            }

            if (project.settings === undefined || project.settings === null) {
                throw new Error('権限がありません');
            }

            res.render('projects/settings', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (err) {
            next(err);
        }
    }
);

export function validate() {
    return [
        body('id')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ID'))
            .matches(/^[0-9a-z\-]+$/)
            .isLength({ min: 5, max: 36 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('ID', 36)),
        body(['name'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME)),
        body(['alternateName'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'alias'))
            .matches(/^[A-Z]{3}$/)
            .withMessage('半角英字3文字で入力してください')
    ];
}

export async function createFromBody(
    req: Request, __: boolean
): Promise<chevre.factory.project.IProject> {
    return {
        id: req.body.id,
        typeOf: chevre.factory.organizationType.Project,
        logo: req.body.logo,
        name: req.body.name,
        alternateName: req.body.alternateName,
        settings: {
            ...(typeof req.body.settings?.sendgridApiKey === 'string')
                ? { sendgridApiKey: req.body.settings.sendgridApiKey }
                : undefined
        }
    };
}

settingsRouter.post(
    '/aggregate',
    async (__1, __2, next) => {
        try {
            throw new Error('implementing...');
            // const taskService = new chevre.service.Task({
            //     endpoint: <string>process.env.API_ENDPOINT,
            //     auth: req.user.authClient,
            //     project: { id: req.project.id }
            // });

            // const task = await taskService.create({
            //     name: chevre.factory.taskName.AggregateOnProject,
            //     project: { typeOf: req.project.typeOf, id: req.project.id },
            //     runsAt: new Date(),
            //     data: {
            //         project: { id: req.project.id },
            //         reservationFor: {
            //             startFrom: moment()
            //                 .tz('Asia/Tokyo')
            //                 .startOf('month')
            //                 .toDate(),
            //             startThrough: moment()
            //                 .tz('Asia/Tokyo')
            //                 .endOf('month')
            //                 .toDate()
            //         }
            //     },
            //     status: chevre.factory.taskStatus.Ready,
            //     numberOfTried: 0,
            //     remainingNumberOfTries: 3,
            //     executionResults: []
            // });

            // res.json(task);
        } catch (err) {
            next(err);
        }
    }
);

export default settingsRouter;
