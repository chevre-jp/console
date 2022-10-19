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
exports.accountTransactionsRouter = void 0;
/**
 * 口座取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const accountTransactionsRouter = (0, express_1.Router)();
exports.accountTransactionsRouter = accountTransactionsRouter;
accountTransactionsRouter.get('', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const accountTransactionService = new sdk_1.chevre.service.AccountTransaction({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        if (req.query.format === 'datatable') {
            const searchConditions = Object.assign({ limit: req.query.limit, page: req.query.page, sort: { startDate: sdk_1.chevre.factory.sortType.Descending }, object: {
                    location: {
                        accountNumber: {
                            $eq: (typeof ((_a = req.query.location) === null || _a === void 0 ? void 0 : _a.accountNumber) === 'string' && req.query.location.accountNumber.length > 0)
                                ? req.query.location.accountNumber
                                : undefined
                        }
                    }
                }, typeOf: {
                    $eq: (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0)
                        ? req.query.typeOf
                        : undefined
                }, transactionNumber: {
                    $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                        ? req.query.transactionNumber
                        : undefined
                }, identifier: {
                    $eq: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                        ? req.query.identifier
                        : undefined
                } }, (typeof req.query.status === 'string' && req.query.status.length > 0)
                ? { status: { $in: [req.query.status] } }
                : undefined);
            const searchResult = yield accountTransactionService.search(Object.assign(Object.assign({}, searchConditions), { issuedThrough: { id: (_b = req.query.issuedThrough) === null || _b === void 0 ? void 0 : _b.id } }));
            searchResult.data = searchResult.data.map((accountTransaction) => {
                let currency;
                if (accountTransaction.typeOf === sdk_1.chevre.factory.account.transactionType.Deposit) {
                    currency = accountTransaction.object.toLocation.accountType;
                }
                else {
                    currency = accountTransaction.object.fromLocation.accountType;
                }
                return Object.assign(Object.assign({}, accountTransaction), { currency });
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
            res.render('accountTransactions/index', {
                moment: moment,
                query: req.query,
                AccountTransactionType: sdk_1.chevre.factory.account.transactionType,
                TransactionStatusType: sdk_1.chevre.factory.transactionStatusType
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
