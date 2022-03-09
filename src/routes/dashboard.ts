/**
 * ダッシュボードルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

const ITEMS_ON_PAGE = 10;

const dashboardRouter = Router();

/**
 * ダッシュボード
 */
dashboardRouter.get(
    '',
    async (req, res, next) => {
        try {
            // 管理プロジェクト検索
            const meService = new chevre.service.Me({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            const { data } = await meService.searchProjects({ limit: 2 });

            // プロジェクトが1つのみであれば、プロジェクトホームへ自動遷移
            if (data.length === 1) {
                res.redirect(`/dashboard/projects/${data[0].id}/select`);

                return;
            }

            const searchProjectsResult = await meService.searchProjects({ limit: ITEMS_ON_PAGE });
            const hasMoreProjects = searchProjectsResult.data.length >= ITEMS_ON_PAGE;

            res.render(
                'dashboard',
                { layout: 'layouts/dashboard', hasMoreProjects }
            );
        } catch (error) {
            next(error);
        }
    }
);

/**
 * プロジェクト検索
 */
dashboardRouter.get(
    '/dashboard/projects',
    async (req, res) => {
        try {
            // 管理プロジェクト検索
            const meService = new chevre.service.Me({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });
            const searchProjectsResult = await meService.searchProjects({ limit: ITEMS_ON_PAGE });

            res.json(searchProjectsResult);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .send(error.message);
        }
    }
);

/**
 * プロジェクト選択
 */
dashboardRouter.get(
    '/dashboard/projects/:id/select',
    async (req, res, next) => {
        try {
            const projectId = req.params.id;

            try {
                const chevreProjectService = new chevre.service.Project({
                    endpoint: <string>process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: '' }
                });
                await chevreProjectService.findById({ id: projectId });
            } catch (error) {
                // プロジェクト未作成であれば初期化プロセスへ
                // if (error.code === NOT_FOUND) {
                //     res.redirect(`/projects/${projectId}/initialize`);

                //     return;
                // }

                throw error;
            }

            res.redirect(`/projects/${projectId}/home`);
        } catch (error) {
            next(error);
        }
    }
);

export default dashboardRouter;
