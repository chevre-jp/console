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
 * 通貨転送取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express = require("express");
const moment = require("moment");
const debug = createDebug('chevre-console:router');
const moneyTransferAssetTransactionsRouter = express.Router();
/**
 * 取引検索
 */
moneyTransferAssetTransactionsRouter.get('/', (req, _, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        debug('searching transactions...', req.query);
        throw new Error('Not implemented');
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引開始
 */
moneyTransferAssetTransactionsRouter.all('/start', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let values = {};
        let message = '';
        if (req.method === 'POST') {
            values = req.body;
            try {
                let transaction;
                const moneyTransferService = new sdk_1.chevre.service.assetTransaction.MoneyTransfer({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                switch (req.body.transactionType) {
                    case sdk_1.chevre.factory.account.transactionType.Deposit:
                    case sdk_1.chevre.factory.account.transactionType.Transfer:
                    case sdk_1.chevre.factory.account.transactionType.Withdraw:
                        const startParams = yield createMoneyTransferStartParams(req);
                        transaction = yield moneyTransferService.start(startParams);
                        break;
                    default:
                        throw new Error(`Transaction type ${req.body.transactionType} not implemented`);
                }
                // セッションに取引追加
                req.session[`assetTransaction:${transaction.id}`] = transaction;
                res.redirect(`/projects/${req.project.id}/assetTransactions/${sdk_1.chevre.factory.assetTransactionType.MoneyTransfer}/${transaction.id}/confirm`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        res.render('assetTransactions/moneyTransfer/start', {
            values: values,
            message: message
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引確認
 */
moneyTransferAssetTransactionsRouter.all('/:transactionId/confirm', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let message;
        let fromPermit;
        let toPermit;
        const transaction = req.session[`assetTransaction:${req.params.transactionId}`];
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction in session');
        }
        if (req.method === 'POST') {
            const moneyTransferService = new sdk_1.chevre.service.assetTransaction.MoneyTransfer({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            // 確定
            switch ((_b = (_a = transaction.object) === null || _a === void 0 ? void 0 : _a.pendingTransaction) === null || _b === void 0 ? void 0 : _b.typeOf) {
                case sdk_1.chevre.factory.account.transactionType.Deposit:
                case sdk_1.chevre.factory.account.transactionType.Transfer:
                case sdk_1.chevre.factory.account.transactionType.Withdraw:
                    yield moneyTransferService.confirm(transaction);
                    break;
                default:
                    throw new Error(`Transaction type ${req.body.transactionType} not implemented`);
            }
            debug('取引確定です。');
            message = '取引を実行しました。';
            // セッション削除
            // tslint:disable-next-line:no-dynamic-delete
            delete req.session[`assetTransaction:${req.params.transactionId}`];
            req.flash('message', '取引を実行しました。');
            res.redirect(`/projects/${req.project.id}/assetTransactions/${sdk_1.chevre.factory.assetTransactionType.MoneyTransfer}/start`);
            return;
        }
        else {
            // 転送元、転送先ペイメントカード情報を検索
            const serviceOutputService = new sdk_1.chevre.service.ServiceOutput({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const accountTransactionType = transaction.object.pendingTransaction.typeOf;
            if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Withdraw
                || accountTransactionType === sdk_1.chevre.factory.account.transactionType.Transfer) {
                const searchPermitsResult = yield serviceOutputService.search({
                    identifier: { $eq: transaction.object.fromLocation.identifier },
                    limit: 1
                });
                fromPermit = searchPermitsResult.data.shift();
                if (fromPermit === undefined) {
                    throw new Error('From Location Not Found');
                }
            }
            if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Deposit
                || accountTransactionType === sdk_1.chevre.factory.account.transactionType.Transfer) {
                const searchPermitsResult = yield serviceOutputService.search({
                    identifier: { $eq: transaction.object.toLocation.identifier },
                    limit: 1
                });
                toPermit = searchPermitsResult.data.shift();
                if (toPermit === undefined) {
                    throw new Error('To Location Not Found');
                }
            }
        }
        res.render('assetTransactions/moneyTransfer/confirm', {
            transaction: transaction,
            message: message,
            fromPermit,
            toPermit
        });
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:max-func-body-length
function createMoneyTransferStartParams(req) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let fromPermit;
        let toPermit;
        const serviceOutputService = new sdk_1.chevre.service.ServiceOutput({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const accountTransactionType = req.body.transactionType;
        if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Withdraw
            || accountTransactionType === sdk_1.chevre.factory.account.transactionType.Transfer) {
            const searchPermitsResult = yield serviceOutputService.search({
                identifier: { $eq: String(req.body.fromPermitIdentifier) },
                limit: 1
            });
            fromPermit = searchPermitsResult.data.shift();
            if (fromPermit === undefined) {
                throw new Error('From Location Not Found');
            }
        }
        if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Deposit) {
            const searchPermitsResult = yield serviceOutputService.search({
                identifier: { $eq: String(req.body.toPermitIdentifier) },
                limit: 1
            });
            toPermit = searchPermitsResult.data.shift();
            if (toPermit === undefined) {
                throw new Error('To Location Not Found');
            }
        }
        const expires = moment()
            .add(1, 'minutes')
            .toDate();
        const agent = {
            typeOf: sdk_1.chevre.factory.personType.Person,
            id: req.user.profile.sub,
            name: req.body.fromName
        };
        const recipient = {
            typeOf: sdk_1.chevre.factory.personType.Person,
            id: '',
            name: req.body.recipientName
        };
        const amount = {
            typeOf: 'MonetaryAmount',
            value: Number(req.body.amount),
            currency: (fromPermit !== undefined)
                ? String((_a = fromPermit.amount) === null || _a === void 0 ? void 0 : _a.currency)
                : String((_b = toPermit === null || toPermit === void 0 ? void 0 : toPermit.amount) === null || _b === void 0 ? void 0 : _b.currency)
        };
        const description = (typeof req.body.description === 'string' && req.body.description.length > 0)
            ? req.body.description
            : undefined;
        let startParams;
        switch (req.body.transactionType) {
            case sdk_1.chevre.factory.account.transactionType.Deposit:
                startParams = {
                    project: req.project,
                    typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                    expires,
                    agent,
                    recipient,
                    object: Object.assign({ pendingTransaction: { typeOf: req.body.transactionType, id: '' }, amount, fromLocation: {
                            typeOf: sdk_1.chevre.factory.personType.Person,
                            name: req.body.fromName
                        }, toLocation: {
                            typeOf: 'Permit',
                            identifier: req.body.toPermitIdentifier
                        } }, (typeof description === 'string') ? { description } : undefined)
                };
                break;
            case sdk_1.chevre.factory.account.transactionType.Transfer:
                startParams = {
                    project: req.project,
                    typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                    expires,
                    agent,
                    recipient,
                    object: Object.assign({ pendingTransaction: { typeOf: req.body.transactionType, id: '' }, amount, fromLocation: {
                            typeOf: 'Permit',
                            identifier: req.body.fromPermitIdentifier
                        }, toLocation: {
                            typeOf: 'Permit',
                            identifier: req.body.toPermitIdentifier
                        } }, (typeof description === 'string') ? { description } : undefined)
                };
                break;
            case sdk_1.chevre.factory.account.transactionType.Withdraw:
                startParams = {
                    project: req.project,
                    typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                    expires,
                    agent,
                    recipient,
                    object: Object.assign({ pendingTransaction: { typeOf: req.body.transactionType, id: '' }, amount, fromLocation: {
                            typeOf: 'Permit',
                            identifier: req.body.fromPermitIdentifier
                        }, toLocation: {
                            typeOf: sdk_1.chevre.factory.personType.Person,
                            name: req.body.recipientName
                        } }, (typeof description === 'string') ? { description } : undefined)
                };
                break;
            default:
                throw new Error(`Transaction type ${req.body.transactionType} not implemented`);
        }
        return startParams;
    });
}
exports.default = moneyTransferAssetTransactionsRouter;
