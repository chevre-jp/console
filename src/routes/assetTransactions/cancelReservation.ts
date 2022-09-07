/**
 * 予約取消取引ルーター
 */
import { chevre } from '@cinerino/sdk';
// import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import * as TimelineFactory from '../../factory/timeline';

// const debug = createDebug('chevre-console:router');
const cancelReservationAssetTransactionsRouter = express.Router();

/**
 * 取引検索
 */
cancelReservationAssetTransactionsRouter.get(
    '/',
    async (req, res, next) => {
        try {
            const assetTransactionService = new chevre.service.AssetTransaction({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions:
                    chevre.factory.assetTransaction.ISearchConditions<chevre.factory.assetTransactionType.CancelReservation> = {
                    limit: req.query.limit,
                    page: req.query.page,
                    sort: { startDate: chevre.factory.sortType.Descending },
                    typeOf: chevre.factory.assetTransactionType.CancelReservation,
                    transactionNumber: {
                        $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                            ? req.query.transactionNumber
                            : undefined
                    }
                };
                const searchResult
                    = await assetTransactionService.search<chevre.factory.assetTransactionType.CancelReservation>(searchConditions);

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((d) => {
                        return {
                            ...d,
                            cancelingReservationIds: (Array.isArray(d.object.reservations))
                                ? d.object.reservations.map((r) => r.id)
                                    .join(',')
                                : ''
                        };
                    })
                });
            } else {
                res.render('assetTransactions/cancelReservation/index', {
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

cancelReservationAssetTransactionsRouter.get(
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

export { cancelReservationAssetTransactionsRouter };
