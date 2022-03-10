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
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const Message = require("../../message");
const TimelineFactory = require("../../factory/timeline");
const debug = createDebug('chevre-console:router');
const moneyTransferAssetTransactionsRouter = express.Router();
/**
 * 取引検索
 */
moneyTransferAssetTransactionsRouter.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
                typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                transactionNumber: {
                    $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                        ? req.query.transactionNumber
                        : undefined
                }
            };
            const searchResult = yield assetTransactionService.search(searchConditions);
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data.map((d) => {
                    return Object.assign({}, d
                    // numSubReservation: (Array.isArray(d.object.subReservation))
                    //     ? d.object.subReservation.length
                    //     : 0
                    );
                })
            });
        }
        else {
            res.render('assetTransactions/moneyTransfer/index', {
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
moneyTransferAssetTransactionsRouter.get('/:transactionId/actions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actionService = new sdk_1.chevre.service.Action({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchActionsByObjectResult = yield actionService.search({
            object: {
                id: { $eq: req.params.transactionId }
            },
            sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
        });
        const searchActionsByPurposeResult = yield actionService.search({
            purpose: {
                id: { $in: [req.params.transactionId] }
            },
            sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
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
/**
 * 取引開始
 */
// tslint:disable-next-line:use-default-type-parameter
moneyTransferAssetTransactionsRouter.all('/start', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let values = {};
        let message = '';
        let errors = {};
        if (req.method === 'POST') {
            values = req.body;
            // バリデーション
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
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
        }
        res.render('assetTransactions/moneyTransfer/start', {
            values: values,
            message: message,
            errors: errors
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
    var _a, _b, _c, _d;
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
            const permitService = new sdk_1.chevre.service.Permit({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const accountTransactionType = (_c = transaction.object.pendingTransaction) === null || _c === void 0 ? void 0 : _c.typeOf;
            if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Withdraw
                || accountTransactionType === sdk_1.chevre.factory.account.transactionType.Transfer) {
                const searchPermitsResult = yield permitService.search({
                    identifier: { $eq: String((_d = transaction.object.fromLocation) === null || _d === void 0 ? void 0 : _d.identifier) },
                    issuedThrough: {
                        id: {
                            // tslint:disable-next-line:max-line-length
                            $eq: transaction.object.fromLocation.issuedThrough.id
                        }
                    },
                    limit: 1
                });
                fromPermit = searchPermitsResult.data.shift();
                if (fromPermit === undefined) {
                    throw new Error('From Location Not Found');
                }
            }
            if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Deposit
                || accountTransactionType === sdk_1.chevre.factory.account.transactionType.Transfer) {
                const searchPermitsResult = yield permitService.search({
                    identifier: { $eq: String(transaction.object.toLocation.identifier) },
                    issuedThrough: {
                        id: {
                            // tslint:disable-next-line:max-line-length
                            $eq: transaction.object.toLocation.issuedThrough.id
                        }
                    },
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
function validate() {
    return [
        express_validator_1.body('issuedThrough.id')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'サービス'))
    ];
}
// tslint:disable-next-line:max-func-body-length
function createMoneyTransferStartParams(req) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        let fromPermit;
        let toPermit;
        const issuedThroughId = String((_a = req.body.issuedThrough) === null || _a === void 0 ? void 0 : _a.id);
        const permitService = new sdk_1.chevre.service.Permit({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const accountTransactionType = req.body.transactionType;
        if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Withdraw
            || accountTransactionType === sdk_1.chevre.factory.account.transactionType.Transfer) {
            const searchPermitsResult = yield permitService.search({
                identifier: { $eq: String(req.body.fromPermitIdentifier) },
                issuedThrough: { id: { $eq: issuedThroughId } },
                limit: 1
            });
            fromPermit = searchPermitsResult.data.shift();
            if (fromPermit === undefined) {
                throw new Error('From Location Not Found');
            }
        }
        if (accountTransactionType === sdk_1.chevre.factory.account.transactionType.Deposit) {
            const searchPermitsResult = yield permitService.search({
                identifier: { $eq: String(req.body.toPermitIdentifier) },
                issuedThrough: { id: { $eq: issuedThroughId } },
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
                ? String((_b = fromPermit.amount) === null || _b === void 0 ? void 0 : _b.currency)
                : String((_c = toPermit === null || toPermit === void 0 ? void 0 : toPermit.amount) === null || _c === void 0 ? void 0 : _c.currency)
        };
        const description = (typeof req.body.description === 'string' && req.body.description.length > 0)
            ? req.body.description
            : undefined;
        let startParams;
        switch (req.body.transactionType) {
            case sdk_1.chevre.factory.account.transactionType.Deposit:
                const toLocation4deposit = {
                    typeOf: sdk_1.chevre.factory.permit.PermitType.Permit,
                    identifier: req.body.toPermitIdentifier,
                    issuedThrough: { id: issuedThroughId }
                };
                startParams = {
                    project: req.project,
                    typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                    expires,
                    agent,
                    recipient,
                    object: Object.assign({ pendingTransaction: { typeOf: req.body.transactionType, id: '' }, amount, fromLocation: {
                            typeOf: sdk_1.chevre.factory.personType.Person,
                            name: req.body.fromName
                        }, toLocation: toLocation4deposit }, (typeof description === 'string') ? { description } : undefined)
                };
                break;
            case sdk_1.chevre.factory.account.transactionType.Transfer:
                const fromLocation4transfer = {
                    typeOf: sdk_1.chevre.factory.permit.PermitType.Permit,
                    identifier: req.body.fromPermitIdentifier,
                    issuedThrough: { id: issuedThroughId }
                };
                const toLocation4transfer = {
                    typeOf: sdk_1.chevre.factory.permit.PermitType.Permit,
                    identifier: req.body.toPermitIdentifier,
                    issuedThrough: { id: issuedThroughId }
                };
                startParams = {
                    project: req.project,
                    typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                    expires,
                    agent,
                    recipient,
                    object: Object.assign({ pendingTransaction: { typeOf: req.body.transactionType, id: '' }, amount, fromLocation: fromLocation4transfer, toLocation: toLocation4transfer }, (typeof description === 'string') ? { description } : undefined)
                };
                break;
            case sdk_1.chevre.factory.account.transactionType.Withdraw:
                const fromLocation4withdraw = {
                    typeOf: sdk_1.chevre.factory.permit.PermitType.Permit,
                    identifier: req.body.fromPermitIdentifier,
                    issuedThrough: { id: issuedThroughId }
                };
                startParams = {
                    project: req.project,
                    typeOf: sdk_1.chevre.factory.assetTransactionType.MoneyTransfer,
                    expires,
                    agent,
                    recipient,
                    object: Object.assign({ pendingTransaction: { typeOf: req.body.transactionType, id: '' }, amount, fromLocation: fromLocation4withdraw, toLocation: {
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
