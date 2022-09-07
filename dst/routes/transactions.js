"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionsRouter = void 0;
/**
 * 取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express = require("express");
const moneyTransfer_1 = require("./transactions/moneyTransfer");
const placeOrder_1 = require("./transactions/placeOrder");
const returnOrder_1 = require("./transactions/returnOrder");
const transactionsRouter = express.Router();
exports.transactionsRouter = transactionsRouter;
transactionsRouter.use(`/${sdk_1.chevre.factory.transactionType.MoneyTransfer}`, moneyTransfer_1.moneyTransferTransactionsRouter);
transactionsRouter.use(`/${sdk_1.chevre.factory.transactionType.PlaceOrder}`, placeOrder_1.placeOrderTransactionsRouter);
transactionsRouter.use(`/${sdk_1.chevre.factory.transactionType.ReturnOrder}`, returnOrder_1.returnOrderTransactionsRouter);
