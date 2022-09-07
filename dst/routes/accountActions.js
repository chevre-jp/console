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
exports.accountActionsRouter = void 0;
/**
 * 口座アクションルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const accountActionsRouter = (0, express_1.Router)();
exports.accountActionsRouter = accountActionsRouter;
accountActionsRouter.get('', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const accountActionService = new sdk_1.chevre.service.AccountAction({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        if (req.query.format === 'datatable') {
            const searchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
                location: {
                    accountNumber: {
                        $eq: (typeof ((_a = req.query.location) === null || _a === void 0 ? void 0 : _a.accountNumber) === 'string' && req.query.location.accountNumber.length > 0)
                            ? req.query.location.accountNumber
                            : undefined
                    },
                    typeOf: {
                        $eq: (typeof ((_b = req.query.location) === null || _b === void 0 ? void 0 : _b.typeOf) === 'string' && req.query.location.typeOf.length > 0)
                            ? req.query.location.typeOf
                            : undefined
                    }
                },
                amount: {
                    currency: {
                        $eq: (typeof ((_c = req.query.amount) === null || _c === void 0 ? void 0 : _c.currency) === 'string' && req.query.amount.currency.length > 0)
                            ? req.query.amount.currency
                            : undefined
                    }
                },
                actionStatus: {
                    $in: (typeof ((_d = req.query.actionStatus) === null || _d === void 0 ? void 0 : _d.$eq) === 'string' && req.query.actionStatus.$eq.length > 0)
                        ? [req.query.actionStatus.$eq]
                        : undefined
                },
                purpose: {
                    typeOf: {
                        $eq: (typeof ((_e = req.query.purpose) === null || _e === void 0 ? void 0 : _e.typeOf) === 'string' && req.query.purpose.typeOf.length > 0)
                            ? req.query.purpose.typeOf
                            : undefined
                    },
                    id: {
                        $eq: (typeof ((_f = req.query.purpose) === null || _f === void 0 ? void 0 : _f.id) === 'string' && req.query.purpose.id.length > 0)
                            ? req.query.purpose.id
                            : undefined
                    },
                    identifier: {
                        $eq: (typeof ((_g = req.query.purpose) === null || _g === void 0 ? void 0 : _g.identifier) === 'string' && req.query.purpose.identifier.length > 0)
                            ? req.query.purpose.identifier
                            : undefined
                    }
                }
            };
            const searchResult = yield accountActionService.search(searchConditions);
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
            res.render('accountActions/index', {
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
