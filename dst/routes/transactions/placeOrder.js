"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 注文取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const TimelineFactory = require("../../factory/timeline");
const debug = createDebug('chevre-backend:routes');
const placeOrderTransactionsRouter = express.Router();
/**
 * 検索
 */
placeOrderTransactionsRouter.get('', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        debug('req.query:', req.query);
        const placeOrderService = new sdk_1.chevre.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchSellersResult = yield sellerService.search({});
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
            typeOf: sdk_1.chevre.factory.transactionType.PlaceOrder,
            ids: (Array.isArray(req.query.ids)) ? req.query.ids : undefined,
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
                    ? req.query.agent.ids.split(',')
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
            object: {},
            result: {
                order: {
                    orderNumbers: (req.query.result !== undefined
                        && req.query.result.order !== undefined
                        && req.query.result.order.orderNumbers !== '')
                        ? req.query.result.order.orderNumbers.split(',')
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
            const searchResult = yield placeOrderService.search(searchConditions);
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data
            });
        }
        else if (req.query.format === sdk_1.chevre.factory.chevre.encodingFormat.Text.csv) {
            throw new sdk_1.chevre.factory.errors.NotImplemented();
        }
        else if (req.query.format === sdk_1.chevre.factory.chevre.encodingFormat.Application.json) {
            throw new sdk_1.chevre.factory.errors.NotImplemented();
        }
        else {
            res.render('transactions/placeOrder/index', {
                moment: moment,
                sellers: searchSellersResult.data,
                TransactionStatusType: sdk_1.chevre.factory.transactionStatusType,
                TransactionTasksExportationStatus: sdk_1.chevre.factory.transactionTasksExportationStatus,
                searchConditions: searchConditions
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引詳細
 */
placeOrderTransactionsRouter.get('/:transactionId', 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeOrderService = new sdk_1.chevre.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchTransactionsResult = yield placeOrderService.search({
            typeOf: sdk_1.chevre.factory.transactionType.PlaceOrder,
            ids: [req.params.transactionId]
        });
        const transaction = searchTransactionsResult.data.shift();
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction');
        }
        let actionsOnTransaction = [];
        try {
            actionsOnTransaction = yield placeOrderService.searchActionsByTransactionId({
                id: transaction.id,
                sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
            });
        }
        catch (error) {
            // no op
        }
        const transactionAgentUrl = (transaction.agent.typeOf === sdk_1.chevre.factory.personType.Person)
            ? `/projects/${req.project.id}/people/${transaction.agent.id}`
            : '#';
        let timelines = [{
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
                actionStatus: sdk_1.chevre.factory.actionStatusType.CompletedActionStatus,
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
                case sdk_1.chevre.factory.transactionStatusType.Canceled:
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
                        actionStatus: sdk_1.chevre.factory.actionStatusType.CompletedActionStatus,
                        actionStatusDescription: 'しました',
                        result: undefined
                    });
                    break;
                case sdk_1.chevre.factory.transactionStatusType.Confirmed:
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
                        actionStatus: sdk_1.chevre.factory.actionStatusType.CompletedActionStatus,
                        actionStatusDescription: 'しました',
                        result: undefined
                    });
                    break;
                case sdk_1.chevre.factory.transactionStatusType.Expired:
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
                        actionStatus: sdk_1.chevre.factory.actionStatusType.CompletedActionStatus,
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
            ActionStatusType: sdk_1.chevre.factory.actionStatusType
        });
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.get('/:transactionId/actions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeOrderService = new sdk_1.chevre.service.transaction.PlaceOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchTransactionsResult = yield placeOrderService.search({
            typeOf: sdk_1.chevre.factory.transactionType.PlaceOrder,
            ids: [req.params.transactionId]
        });
        const transaction = searchTransactionsResult.data.shift();
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction');
        }
        const actionsOnTransaction = yield placeOrderService.searchActionsByTransactionId({
            id: transaction.id,
            sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
        });
        res.json(actionsOnTransaction.map((a) => {
            return Object.assign(Object.assign({}, a), { timeline: TimelineFactory.createFromAction({
                    project: { id: req.project.id },
                    action: a
                }) });
        }));
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
}));
exports.default = placeOrderTransactionsRouter;
