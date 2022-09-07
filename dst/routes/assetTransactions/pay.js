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
exports.payTransactionsRouter = void 0;
/**
 * 決済取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
// import * as createDebug from 'debug';
const express = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const TimelineFactory = require("../../factory/timeline");
// const debug = createDebug('chevre-console:router');
const payTransactionsRouter = express.Router();
exports.payTransactionsRouter = payTransactionsRouter;
/**
 * 取引検索
 */
payTransactionsRouter.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assetTransactionService = new sdk_1.chevre.service.AssetTransaction({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        if (req.query.format === 'datatable') {
            const searchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
                typeOf: sdk_1.chevre.factory.assetTransactionType.Pay,
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
                    }
                }
            };
            const searchResult = yield assetTransactionService.search(searchConditions);
            searchResult.data = searchResult.data.map((a) => {
                return Object.assign({}, a);
            });
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data
            });
        }
        else {
            res.render('assetTransactions/pay/index', {
                moment: moment,
                query: req.query,
                ActionStatusType: sdk_1.chevre.factory.actionStatusType
            });
        }
    }
    catch (error) {
        if (req.query.format === 'datatable') {
            res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
        else {
            next(error);
        }
    }
}));
payTransactionsRouter.get('/:transactionNumber/actions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actionService = new sdk_1.chevre.service.Action({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchActionsResult = yield actionService.search({
            object: {
                paymentMethod: {
                    paymentMethodId: { $eq: req.params.transactionNumber }
                }
            },
            sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
        });
        res.json(searchActionsResult.data.map((a) => {
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
payTransactionsRouter.get('/:transactionNumber/searchGMOTrade', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payTransactionService = new sdk_1.chevre.service.assetTransaction.Pay({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const result = yield payTransactionService.searchGMOTrade({
            transactionNumber: req.params.transactionNumber
        });
        res.json(result);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
}));
