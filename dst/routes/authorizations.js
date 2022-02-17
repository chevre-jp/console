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
 * 承認ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const moment = require("moment");
const orderStatusType_1 = require("../factory/orderStatusType");
const TimelineFactory = require("../factory/timeline");
const authorizationsRouter = express_1.Router();
authorizationsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('authorizations/index', {
        message: '',
        orderStatusTypes: orderStatusType_1.orderStatusTypes
    });
}));
authorizationsRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const authorizationService = new sdk_1.chevre.service.Authorization({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            sort: { validFrom: sdk_1.chevre.factory.sortType.Descending },
            code: {
                $in: (typeof req.query.code === 'string' && req.query.code.length > 0)
                    ? [req.query.code]
                    : undefined
            },
            validFrom: (typeof req.query.validFrom === 'string' && req.query.validFrom.length > 0)
                ? moment(`${String(req.query.validFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            validThrough: (typeof req.query.validThrough === 'string' && req.query.validThrough.length > 0)
                ? moment(`${String(req.query.validThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate()
                : undefined,
            object: {
                typeOfs: (typeof ((_a = req.query.object) === null || _a === void 0 ? void 0 : _a.typeOf) === 'string' && req.query.object.typeOf.length > 0)
                    ? [req.query.object.typeOf]
                    : undefined,
                ids: (typeof ((_b = req.query.object) === null || _b === void 0 ? void 0 : _b.id) === 'string' && req.query.object.id.length > 0)
                    ? [req.query.object.id]
                    : undefined
                // typeOfGood?: {
                //     typeOfs?: string[];
                //     ids?: string[];
                // };}
            }
        };
        const { data } = yield authorizationService.search(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((authorization) => {
                return Object.assign({}, authorization);
            })
        });
    }
    catch (err) {
        res.json({
            message: err.message,
            success: false,
            count: 0,
            results: []
        });
    }
}));
authorizationsRouter.get('/:id/actions', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actionService = new sdk_1.chevre.service.Action({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const authorizationService = new sdk_1.chevre.service.Authorization({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchAuthorizationsResult = yield authorizationService.search({
            limit: 1,
            id: { $in: [req.params.id] },
            project: { id: { $eq: req.project.id } }
        });
        const authorization = searchAuthorizationsResult.data.shift();
        if (authorization === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Authorization');
        }
        // アクション
        const actionsOnAuthorizations = [];
        try {
            // コード発行
            const searchAuthorizeActionsResult = yield actionService.search({
                limit: 100,
                sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                typeOf: sdk_1.chevre.factory.actionType.AuthorizeAction,
                result: {
                    typeOf: { $in: ['Authorization'] },
                    code: { $in: [authorization.code] }
                }
            });
            actionsOnAuthorizations.push(...searchAuthorizeActionsResult.data);
        }
        catch (error) {
            // no op
        }
        res.json(actionsOnAuthorizations.map((a) => {
            return Object.assign(Object.assign({}, a), { timeline: TimelineFactory.createFromAction({
                    project: { id: req.project.id },
                    action: a
                }) });
        }));
    }
    catch (error) {
        next(error);
    }
}));
exports.default = authorizationsRouter;
