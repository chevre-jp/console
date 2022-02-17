/**
 * プロジェクトルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { validationResult } from 'express-validator';

import { createFromBody, validate } from './settings';

// const ADMIN_USER_POOL_ID = <string>process.env.ADMIN_USER_POOL_ID;

const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
    ? process.env.PROJECT_CREATOR_IDS.split(',')
    : [];

const projectsRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
projectsRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res, next) => {
        try {
            // 特定のユーザーにのみ許可
            if (!PROJECT_CREATOR_IDS.includes(req.user.profile.sub)) {
                throw new chevre.factory.errors.Forbidden('not project creator');
            }

            let message = '';
            let errors: any = {};

            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                // 検証
                if (validatorResult.isEmpty()) {
                    // 登録プロセス
                    try {
                        let project = await createFromBody(req, true);

                        project = await projectService.create(project);
                        req.flash('message', '登録しました');
                        res.redirect(`/projects/${project.id}/settings`);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                settings: {
                    // cognito: { customerUserPool: { id: ADMIN_USER_POOL_ID } }
                },
                ...req.body
            };

            if (req.method === 'POST') {
                // no op
            } else {
                // no op
            }

            res.render('projects/new', {
                layout: 'layouts/dashboard',
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * プロジェクト初期化
 */
// tslint:disable-next-line:use-default-type-parameter
projectsRouter.get<ParamsDictionary>(
    '/:id/initialize',
    async (req, res, next) => {
        try {
            res.redirect(`/projects/${req.params.id}/home`);
        } catch (err) {
            next(err);
        }
    }
);

export default projectsRouter;
