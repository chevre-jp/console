/**
 * アプリケーションルーター
 */
import * as cinerino from '@cinerino/api-nodejs-client';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

const applicationsRouter = Router();

applicationsRouter.get(
    '/search',
    async (req, res) => {
        try {
            const iamService = new cinerino.service.IAM({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = 10;
            const page = 1;
            const nameRegex = req.query.name;

            const searchConditions: any = {
                limit: limit,
                member: {
                    typeOf: { $eq: cinerino.factory.creativeWorkType.WebApplication },
                    name: { $regex: (typeof nameRegex === 'string' && nameRegex.length > 0) ? nameRegex : undefined }
                }
            };
            const { data } = await iamService.searchMembers(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((d) => d.member)
                    .sort((a, b) => {
                        if (String(a.name) < String(b.name)) {
                            return -1;
                        }
                        if (String(a.name) > String(b.name)) {
                            return 1;
                        }

                        return 0;
                    })
            });
        } catch (err) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: err.message
                });
        }
    }
);

export default applicationsRouter;