/**
 * 取引ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as express from 'express';

import moneyTransferTransactionsRouter from './transactions/moneyTransfer';
import placeOrderTransactionsRouter from './transactions/placeOrder';
import returnOrderTransactionsRouter from './transactions/returnOrder';

const transactionsRouter = express.Router();
transactionsRouter.use(`/${chevre.factory.transactionType.MoneyTransfer}`, moneyTransferTransactionsRouter);
transactionsRouter.use(`/${chevre.factory.transactionType.PlaceOrder}`, placeOrderTransactionsRouter);
transactionsRouter.use(`/${chevre.factory.transactionType.ReturnOrder}`, returnOrderTransactionsRouter);
export default transactionsRouter;
