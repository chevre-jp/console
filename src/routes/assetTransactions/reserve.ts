/**
 * 予約取引ルーター
 */
import { chevre } from '@cinerino/sdk';
// import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import * as TimelineFactory from '../../factory/timeline';

// const debug = createDebug('chevre-console:router');
const reserveTransactionsRouter = express.Router();

/**
 * 取引検索
 */
reserveTransactionsRouter.get(
    '/',
    async (req, res, next) => {
        try {
            const assetTransactionService = new chevre.service.AssetTransaction({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions: chevre.factory.assetTransaction.ISearchConditions<chevre.factory.assetTransactionType.Reserve> = {
                    limit: req.query.limit,
                    page: req.query.page,
                    sort: { startDate: chevre.factory.sortType.Descending },
                    typeOf: chevre.factory.assetTransactionType.Reserve,
                    transactionNumber: {
                        $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                            ? req.query.transactionNumber
                            : undefined
                    }
                };
                const searchResult = await assetTransactionService.search<chevre.factory.assetTransactionType.Reserve>(searchConditions);

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((d) => {
                        return {
                            ...d,
                            numSubReservation: (Array.isArray(d.object.subReservation))
                                ? d.object.subReservation.length
                                : 0
                        };
                    })
                });
            } else {
                res.render('assetTransactions/reserve/index', {
                    moment: moment,
                    query: req.query,
                    ActionStatusType: chevre.factory.actionStatusType
                });
            }
        } catch (error) {
            if (req.query.format === 'datatable') {
                res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                    .json({ message: error.message });
            } else {
                next(error);
            }
        }
    }
);

reserveTransactionsRouter.get(
    '/:transactionId/actions',
    async (req, res) => {
        try {
            const actionService = new chevre.service.Action({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchActionsByObjectResult = await actionService.search({
                object: {
                    id: { $eq: req.params.transactionId }
                },
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            const searchActionsByPurposeResult = await actionService.search({
                purpose: {
                    id: { $in: [req.params.transactionId] }
                },
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            res.json([
                ...searchActionsByObjectResult.data,
                ...searchActionsByPurposeResult.data
            ]
                .sort((a, b) => {
                    return (moment(a.startDate)
                        .isAfter(b.startDate))
                        ? 1
                        : -1;
                })
                .map((a) => {
                    return {
                        ...a,
                        timeline: TimelineFactory.createFromAction({
                            project: { id: req.project.id },
                            action: a
                        })
                    };
                }));
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

export default reserveTransactionsRouter;
