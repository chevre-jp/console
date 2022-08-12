/**
 * プロジェクトルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import { Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { validationResult } from 'express-validator';
import { NO_CONTENT } from 'http-status';

import { createFromBody, validate } from './settings';

const debug = createDebug('chevre-backend:routes');
const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
    ? process.env.PROJECT_CREATOR_IDS.split(',')
    : [];

const projectsRouter = Router();

/**
 * 検索
 */
projectsRouter.get(
    '',
    async (req, res, next) => {
        try {
            // 管理プロジェクト検索
            const meService = new chevre.service.Me({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            const searchConditions = {
                limit: Number(req.query.limit),
                page: Number(req.query.page),
                id: {
                    $regex: (typeof req.query.id?.$regex === 'string' && req.query.id.$regex.length > 0)
                        ? String(req.query.id.$regex)
                        : undefined
                }

            };
            debug('searchConditions:', searchConditions);

            if (req.query.format === 'datatable') {
                const searchResult = await meService.searchProjects(searchConditions);

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((d) => {
                        return {
                            ...d
                        };
                    })
                });
            } else {
                res.render('projects/index', {
                    layout: 'layouts/dashboard',
                    searchConditions: searchConditions
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

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
                settings: {},
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

projectsRouter.get(
    '/:id/\\$thumbnailUrlStr\\$',
    (__, res) => {
        res.status(NO_CONTENT)
            .end();
    }
);

export default projectsRouter;
