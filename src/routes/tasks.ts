/**
 * タスクルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

const tasksRouter = Router();

tasksRouter.get(
    '',
    async (__, res) => {
        res.render('tasks/index', {
            message: '',
            TaskName: chevre.factory.taskName,
            TaskStatus: chevre.factory.taskStatus
        });
    }
);

tasksRouter.get(
    '/search',
    async (req, res) => {
        try {
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: chevre.factory.task.ISearchConditions<chevre.factory.taskName> = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { runsAt: chevre.factory.sortType.Descending },
                project: { id: { $eq: req.project.id } },
                name: (typeof req.query.name?.$eq === 'string' && req.query.name.$eq.length > 0)
                    ? req.query.name.$eq
                    : undefined,
                statuses: (typeof req.query.status?.$eq === 'string' && req.query.status.$eq.length > 0)
                    ? [req.query.status.$eq]
                    : undefined
            };
            const { data } = await taskService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data
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

tasksRouter.get(
    '/:id',
    async (req, res, next) => {
        try {
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const task = await taskService.findById({ id: req.params.id, name: req.query.taskName });

            res.render('tasks/details', {
                task
            });
        } catch (err) {
            next(err);
        }
    }
);

export default tasksRouter;
