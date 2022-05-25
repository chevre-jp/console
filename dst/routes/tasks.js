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
 * タスクルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const tasksRouter = express_1.Router();
tasksRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('tasks/index', {
        message: '',
        TaskName: sdk_1.chevre.factory.taskName,
        TaskStatus: sdk_1.chevre.factory.taskStatus
    });
}));
tasksRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const objectTransactionNumberEq = (_c = (_b = (_a = req.query.data) === null || _a === void 0 ? void 0 : _a.object) === null || _b === void 0 ? void 0 : _b.transactionNumber) === null || _c === void 0 ? void 0 : _c.$eq;
        const purposeOrderNumberEq = (_f = (_e = (_d = req.query.data) === null || _d === void 0 ? void 0 : _d.purpose) === null || _e === void 0 ? void 0 : _e.orderNumber) === null || _f === void 0 ? void 0 : _f.$eq;
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            sort: { runsAt: sdk_1.chevre.factory.sortType.Descending },
            project: { id: { $eq: req.project.id } },
            name: (typeof ((_g = req.query.name) === null || _g === void 0 ? void 0 : _g.$eq) === 'string' && req.query.name.$eq.length > 0)
                ? req.query.name.$eq
                : undefined,
            statuses: (typeof ((_h = req.query.status) === null || _h === void 0 ? void 0 : _h.$eq) === 'string' && req.query.status.$eq.length > 0)
                ? [req.query.status.$eq]
                : undefined,
            data: {
                object: {
                    transactionNumber: (typeof objectTransactionNumberEq === 'string' && objectTransactionNumberEq.length > 0)
                        ? { $eq: objectTransactionNumberEq }
                        : undefined
                },
                purpose: {
                    orderNumber: (typeof purposeOrderNumberEq === 'string' && purposeOrderNumberEq.length > 0)
                        ? { $eq: purposeOrderNumberEq }
                        : undefined
                }
            }
        };
        const { data } = yield taskService.search(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data
        });
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
tasksRouter.get('/:id', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const task = yield taskService.findById({ id: req.params.id, name: req.query.taskName });
        res.render('tasks/details', {
            task
        });
    }
    catch (err) {
        next(err);
    }
}));
exports.default = tasksRouter;
