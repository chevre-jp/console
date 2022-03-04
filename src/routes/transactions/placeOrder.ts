/**
 * 注文取引ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import * as TimelineFactory from '../../factory/timeline';

const debug = createDebug('chevre-backend:routes');
const placeOrderTransactionsRouter = express.Router();

/**
 * 検索
 */
placeOrderTransactionsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            debug('req.query:', req.query);
            const placeOrderService = new chevre.service.transaction.PlaceOrder({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchSellersResult = await sellerService.search({});

            const searchConditions: chevre.factory.transaction.ISearchConditions<chevre.factory.transactionType.PlaceOrder> = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { startDate: chevre.factory.sortType.Descending },
                typeOf: chevre.factory.transactionType.PlaceOrder,
                ids: (typeof req.query.id === 'string' && req.query.id.length > 0) ? [req.query.id] : undefined,
                statuses: (req.query.statuses !== undefined) ? req.query.statuses : undefined,
                startFrom: (req.query.startRange !== undefined && req.query.startRange !== '')
                    ? moment(req.query.startRange.split(' - ')[0])
                        .toDate()
                    : undefined,
                startThrough: (req.query.startRange !== undefined && req.query.startRange !== '')
                    ? moment(req.query.startRange.split(' - ')[1])
                        .toDate()
                    : undefined,
                endFrom: (req.query.endFrom !== undefined)
                    ? moment(req.query.endFrom)
                        .toDate()
                    : undefined,
                endThrough: (req.query.endThrough !== undefined)
                    ? moment(req.query.endThrough)
                        .toDate()
                    : undefined,
                agent: {
                    ids: (req.query.agent !== undefined && req.query.agent.ids !== undefined && req.query.agent.ids !== '')
                        ? (<string>req.query.agent.ids).split(',')
                            .map((v) => v.trim())
                        : undefined,
                    givenName: (req.query.agent !== undefined
                        && req.query.agent.givenName !== '')
                        ? req.query.agent.givenName : undefined,
                    familyName: (req.query.agent !== undefined
                        && req.query.agent.familyName !== '')
                        ? req.query.agent.familyName : undefined,
                    telephone: (req.query.agent !== undefined
                        && req.query.agent.telephone !== '')
                        ? req.query.agent.telephone : undefined,
                    email: (req.query.agent !== undefined
                        && req.query.agent.email !== '')
                        ? req.query.agent.email : undefined
                },
                seller: {
                    ids: (req.query.seller !== undefined && req.query.seller.ids !== undefined)
                        ? req.query.seller.ids
                        : undefined
                },
                object: {
                },
                result: {
                    order: {
                        orderNumbers: (req.query.result !== undefined
                            && req.query.result.order !== undefined
                            && req.query.result.order.orderNumbers !== '')
                            ? (<string>req.query.result.order.orderNumbers).split(',')
                                .map((v) => v.trim())
                            : undefined
                    }
                },
                tasksExportationStatuses: (req.query.tasksExportationStatuses !== undefined)
                    ? req.query.tasksExportationStatuses
                    : undefined
            };
            debug('searchConditions:', searchConditions);

            if (req.query.format === 'datatable') {
                const searchResult = await placeOrderService.search(searchConditions);
                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((d) => {
                        return {
                            ...d,
                            seconds: (d.endDate !== undefined)
                                ? `${Math.floor(moment.duration(moment(d.endDate)
                                    .diff(d.startDate))
                                    .asSeconds())} s`
                                : ''
                        };
                    })
                });
            } else {
                res.render('transactions/placeOrder/index', {
                    moment: moment,
                    sellers: searchSellersResult.data,
                    TransactionStatusType: chevre.factory.transactionStatusType,
                    TransactionTasksExportationStatus: chevre.factory.transactionTasksExportationStatus,
                    searchConditions: searchConditions
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引詳細
 */
placeOrderTransactionsRouter.get(
    '/:transactionId',
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const placeOrderService = new chevre.service.transaction.PlaceOrder({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchTransactionsResult = await placeOrderService.search({
                typeOf: chevre.factory.transactionType.PlaceOrder,
                ids: [req.params.transactionId]
            });
            const transaction = searchTransactionsResult.data.shift();
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction');
            }

            let actionsOnTransaction: any[] = [];
            try {
                actionsOnTransaction = await placeOrderService.searchActionsByTransactionId({
                    id: transaction.id,
                    sort: { startDate: chevre.factory.sortType.Ascending }
                });
            } catch (error) {
                // no op
            }

            const transactionAgentUrl = (transaction.agent.typeOf === chevre.factory.personType.Person)
                ? `/projects/${req.project.id}/people/${transaction.agent.id}`
                : '#';

            let timelines: TimelineFactory.ITimeline[] = [{
                action: {},
                agent: {
                    id: transaction.agent.id,
                    name: transaction.agent.id,
                    url: transactionAgentUrl
                },
                actionName: '開始',
                object: {
                    name: '取引'
                },
                startDate: transaction.startDate,
                actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                actionStatusDescription: 'しました',
                result: undefined
            }];

            timelines.push(...actionsOnTransaction.map((a) => {
                return TimelineFactory.createFromAction({
                    project: req.project,
                    action: a
                });
            }));

            if (transaction.endDate !== undefined) {
                switch (transaction.status) {
                    case chevre.factory.transactionStatusType.Canceled:
                        timelines.push({
                            action: {},
                            agent: {
                                id: transaction.agent.id,
                                name: transaction.agent.id,
                                url: transactionAgentUrl
                            },
                            actionName: '中止',
                            object: { name: '取引' },
                            startDate: transaction.endDate,
                            actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                            actionStatusDescription: 'しました',
                            result: undefined
                        });
                        break;
                    case chevre.factory.transactionStatusType.Confirmed:
                        timelines.push({
                            action: {},
                            agent: {
                                id: transaction.agent.id,
                                name: transaction.agent.id,
                                url: transactionAgentUrl
                            },
                            actionName: '確定',
                            object: { name: '取引' },
                            startDate: transaction.endDate,
                            actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                            actionStatusDescription: 'しました',
                            result: undefined
                        });
                        break;
                    case chevre.factory.transactionStatusType.Expired:
                        timelines.push({
                            action: {},
                            agent: {
                                id: '#',
                                name: 'システム',
                                url: '#'
                            },
                            actionName: '終了',
                            object: { name: '取引' },
                            startDate: transaction.endDate,
                            actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                            actionStatusDescription: 'しました',
                            result: undefined
                        });
                        break;
                    default:
                }
            }

            timelines = timelines.sort((a, b) => Number(a.startDate > b.startDate));

            res.render('transactions/placeOrder/show', {
                moment: moment,
                transaction: transaction,
                timelines: timelines,
                ActionStatusType: chevre.factory.actionStatusType
            });
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.get(
    '/:transactionId/actions',
    async (req, res) => {
        try {
            const placeOrderService = new chevre.service.transaction.PlaceOrder({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchTransactionsResult = await placeOrderService.search({
                typeOf: chevre.factory.transactionType.PlaceOrder,
                ids: [req.params.transactionId]
            });
            const transaction = searchTransactionsResult.data.shift();
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction');
            }

            const actionsOnTransaction = await placeOrderService.searchActionsByTransactionId({
                id: transaction.id,
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            res.json(actionsOnTransaction.map((a) => {
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

export default placeOrderTransactionsRouter;
