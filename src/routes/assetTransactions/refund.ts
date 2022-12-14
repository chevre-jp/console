/**
 * 返金取引ルーター
 */
import { chevre } from '@cinerino/sdk';
// import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import * as TimelineFactory from '../../factory/timeline';

// const debug = createDebug('chevre-console:router');
const refundTransactionsRouter = express.Router();

/**
 * 取引検索
 */
refundTransactionsRouter.get(
    '/',
    async (req, res, next) => {
        try {
            const assetTransactionService = new chevre.service.AssetTransaction({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions: chevre.factory.assetTransaction.ISearchConditions<chevre.factory.assetTransactionType.Refund> = {
                    limit: req.query.limit,
                    page: req.query.page,
                    sort: { startDate: chevre.factory.sortType.Descending },
                    typeOf: chevre.factory.assetTransactionType.Refund,
                    transactionNumber: {
                        $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                            ? req.query.transactionNumber
                            : undefined
                    },
                    object: {
                        accountId: {
                            $eq: (typeof req.query.accountId === 'string' && req.query.accountId.length > 0)
                                ? req.query.accountId
                                : undefined
                        },
                        paymentMethodId: {
                            $eq: (typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                                ? req.query.paymentMethodId
                                : undefined
                        }
                    }
                };
                const searchResult = await assetTransactionService.search(searchConditions);

                searchResult.data = searchResult.data.map((a) => {
                    return {
                        ...a
                    };
                });

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data
                });
            } else {
                res.render('assetTransactions/refund/index', {
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

refundTransactionsRouter.get(
    '/:transactionNumber/actions',
    async (req, res) => {
        try {
            const actionService = new chevre.service.Action({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchActionsResult = await actionService.search({
                object: {
                    paymentMethod: {
                        paymentMethodId: { $eq: req.params.transactionNumber }
                    }
                },
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            res.json(searchActionsResult.data.map((a) => {
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

export { refundTransactionsRouter };
