/**
 * グローバル集計ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import * as moment from 'moment';

// const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
//     ? process.env.PROJECT_CREATOR_IDS.split(',')
//     : [];

const aggregationsRouter = Router();

aggregationsRouter.get(
    '',
    async (req, res, next) => {
        try {
            const aggregationService = new chevre.service.Aggregation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            const searchConditions = {
                limit: Number(req.query.limit),
                page: Number(req.query.page),
                aggregateStart: {
                    $gte: moment()
                        .add(-1, 'year')
                        .toDate(),
                    $lte: moment()
                        .toDate()
                }
            };

            if (req.query.format === 'datatable') {
                const searchResult = await aggregationService.search(searchConditions);

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
                res.render('aggregations/index', {
                    layout: 'layouts/dashboard'
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

export { aggregationsRouter };
