/**
 * IAMロールルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

const iamRolesRouter = Router();

iamRolesRouter.get(
    '',
    async (__, res) => {
        res.render('iam/roles/index', {
            message: '',
            TaskName: chevre.factory.taskName,
            TaskStatus: chevre.factory.taskStatus
        });
    }
);

iamRolesRouter.get(
    '/search',
    async (req, res) => {
        try {
            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                roleName: (typeof req.query.roleName?.$eq === 'string' && req.query.roleName.$eq.length > 0)
                    ? { $eq: req.query.roleName.$eq }
                    : undefined
            };
            const { data } = await iamService.searchRoles(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((r) => {
                    return {
                        ...r,
                        permissionsStr: (Array.isArray(r.permissions))
                            ? r.permissions
                                .map((p: any) => `<span class="badge badge-secondary">${p}</span>`)
                                .join(' ')
                            : '',
                        numPermissions: (Array.isArray(r.permissions))
                            ? r.permissions.length
                            : 0
                    };
                })
            });
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    count: 0,
                    results: []
                });
        }
    }
);

export default iamRolesRouter;
