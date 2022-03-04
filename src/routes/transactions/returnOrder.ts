/**
 * 注文返品取引ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import * as TimelineFactory from '../../factory/timeline';

const debug = createDebug('chevre-backend:routes');
const returnOrderTransactionsRouter = express.Router();
/**
 * 検索
 */
returnOrderTransactionsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            debug('req.query:', req.query);
            const returnOrderService = new chevre.service.transaction.ReturnOrder({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const transactionStatusChoices = [
                chevre.factory.transactionStatusType.Canceled,
                chevre.factory.transactionStatusType.Confirmed,
                chevre.factory.transactionStatusType.Expired,
                chevre.factory.transactionStatusType.InProgress
            ];
            const searchConditions: chevre.factory.transaction.ISearchConditions<chevre.factory.transactionType.ReturnOrder> = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { startDate: chevre.factory.sortType.Descending },
                typeOf: chevre.factory.transactionType.ReturnOrder,
                ids: (typeof req.query.id === 'string' && req.query.id.length > 0) ? [req.query.id] : undefined,
                statuses: (req.query.statuses !== undefined)
                    ? req.query.statuses
                    : transactionStatusChoices,
                startFrom: (req.query.startRange !== undefined && req.query.startRange !== '')
                    ? moment(req.query.startRange.split(' - ')[0])
                        .toDate()
                    : moment()
                        .add(-1, 'day')
                        .toDate(),
                startThrough: (req.query.startRange !== undefined && req.query.startRange !== '')
                    ? moment(req.query.startRange.split(' - ')[1])
                        .toDate()
                    : moment()
                        .toDate(),
                endFrom: (req.query.endFrom !== undefined) ? moment(req.query.endFrom)
                    .toDate() : undefined,
                endThrough: (req.query.endThrough !== undefined) ? moment(req.query.endThrough)
                    .toDate() : undefined,
                agent: {
                    ids: (req.query.agent !== undefined && req.query.agent.ids !== '')
                        ? (<string>req.query.agent.ids).split(',')
                            .map((v) => v.trim())
                        : undefined
                },
                object: {
                    order: {
                        orderNumbers: (req.query.object !== undefined
                            && req.query.object.order !== undefined
                            && req.query.object.order.orderNumbers !== '')
                            ? (<string>req.query.object.order.orderNumbers).split(',')
                                .map((v) => v.trim())
                            : undefined
                    }
                },
                tasksExportationStatuses: (req.query.tasksExportationStatuses !== undefined)
                    ? req.query.tasksExportationStatuses
                    : Object.values(chevre.factory.transactionTasksExportationStatus)
            };
            if (req.query.format === 'datatable') {
                const searchResult = await returnOrderService.search(searchConditions);
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
                res.render('transactions/returnOrder/index', {
                    moment: moment,
                    transactionStatusChoices: transactionStatusChoices,
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
returnOrderTransactionsRouter.get(
    '/:transactionId',
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const returnOrderService = new chevre.service.transaction.ReturnOrder({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchTransactionsResult = await returnOrderService.search({
                typeOf: chevre.factory.transactionType.ReturnOrder,
                ids: [req.params.transactionId]
            });
            const transaction = searchTransactionsResult.data.shift();
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction');
            }
            // const actionsOnTransaction = await returnOrderService.searchActionsByTransactionId({
            //     transactionId: transaction.id,
            //     sort: { endDate: chevre.factory.sortType.Ascending }
            // });

            let timelines: TimelineFactory.ITimeline[] = [{
                action: {},
                agent: {
                    id: transaction.agent.id,
                    name: transaction.agent.id,
                    url: '#'
                },
                actionName: '開始',
                object: { name: '取引' },
                startDate: transaction.startDate,
                actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                actionStatusDescription: 'しました',
                result: undefined
            }];

            // timelines.push(...actionsOnTransaction.map((a) => {
            //     return TimelineFactory.createFromAction({
            //         project: req.project,
            //         action: a
            //     });
            // }));

            if (transaction.endDate !== undefined) {
                switch (transaction.status) {
                    case chevre.factory.transactionStatusType.Canceled:
                        timelines.push({
                            action: {},
                            agent: {
                                id: transaction.agent.id,
                                name: transaction.agent.id,
                                url: '#'
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
                                url: '#'
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

            res.render('transactions/returnOrder/show', {
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

returnOrderTransactionsRouter.get(
    '/:transactionId/actions',
    async (req, res) => {
        try {
            const returnOrderService = new chevre.service.transaction.ReturnOrder({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchTransactionsResult = await returnOrderService.search({
                typeOf: chevre.factory.transactionType.ReturnOrder,
                ids: [req.params.transactionId]
            });
            const transaction = searchTransactionsResult.data.shift();
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction');
            }

            const actionsOnTransaction: any[] = [];
            // const actionsOnTransaction = await returnOrderService.searchActionsByTransactionId({
            //     id: transaction.id,
            //     sort: { startDate: chevre.factory.sortType.Ascending }
            // });

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

export default returnOrderTransactionsRouter;
