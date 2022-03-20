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
 * 所有権ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const productType_1 = require("../factory/productType");
const TimelineFactory = require("../factory/timeline");
const AUTHORIZATION_EXPIRES_IN_SECONDS = 600;
const ownershipInfosRouter = express_1.Router();
ownershipInfosRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('ownershipInfos/index', {
        message: '',
        productTypes: productType_1.productTypes
    });
}));
ownershipInfosRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const ownershipInfoService = new sdk_1.chevre.service.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            project: { id: { $eq: req.project.id } },
            ids: (typeof ((_a = req.query.id) === null || _a === void 0 ? void 0 : _a.$eq) === 'string' && req.query.id.$eq.length > 0)
                ? [req.query.id.$eq]
                : undefined,
            ownedFrom: (typeof req.query.ownedFrom === 'string' && req.query.ownedFrom.length > 0)
                ? moment(`${String(req.query.ownedFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            ownedThrough: (typeof req.query.ownedThrough === 'string' && req.query.ownedThrough.length > 0)
                ? moment(`${String(req.query.ownedThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate()
                : undefined,
            ownedBy: {
                id: (typeof ((_b = req.query.ownedBy) === null || _b === void 0 ? void 0 : _b.id) === 'string' && req.query.ownedBy.id.length > 0)
                    ? req.query.ownedBy.id
                    : undefined
            },
            typeOfGood: {
                typeOf: (typeof ((_c = req.query.typeOfGood) === null || _c === void 0 ? void 0 : _c.typeOf) === 'string' && req.query.typeOfGood.typeOf.length > 0)
                    ? { $eq: req.query.typeOfGood.typeOf }
                    : undefined,
                id: (typeof ((_d = req.query.typeOfGood) === null || _d === void 0 ? void 0 : _d.id) === 'string' && req.query.typeOfGood.id.length > 0)
                    ? { $eq: req.query.typeOfGood.id }
                    : undefined,
                identifier: (typeof ((_e = req.query.typeOfGood) === null || _e === void 0 ? void 0 : _e.identifier) === 'string' && req.query.typeOfGood.identifier.length > 0)
                    ? { $eq: req.query.typeOfGood.identifier }
                    : undefined,
                issuedThrough: {
                    id: (typeof ((_g = (_f = req.query.typeOfGood) === null || _f === void 0 ? void 0 : _f.issuedThrough) === null || _g === void 0 ? void 0 : _g.id) === 'string'
                        && req.query.typeOfGood.issuedThrough.id.length > 0)
                        ? { $eq: req.query.typeOfGood.issuedThrough.id }
                        : undefined,
                    typeOf: (typeof ((_j = (_h = req.query.typeOfGood) === null || _h === void 0 ? void 0 : _h.issuedThrough) === null || _j === void 0 ? void 0 : _j.typeOf) === 'string'
                        && req.query.typeOfGood.issuedThrough.typeOf.length > 0)
                        ? { $eq: req.query.typeOfGood.issuedThrough.typeOf }
                        : undefined
                }
            }
        };
        const { data } = yield ownershipInfoService.search(Object.assign(Object.assign({}, searchConditions), { includeGoodWithDetails: (req.query.includeGoodWithDetails === '1') ? '1' : undefined }));
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((ownershipInfo) => {
                return Object.assign({}, ownershipInfo);
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
ownershipInfosRouter.get('/:id/actions', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actionService = new sdk_1.chevre.service.Action({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const ownershipInfoService = new sdk_1.chevre.service.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOwnershipInfosResult = yield ownershipInfoService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            ids: [req.params.id]
        });
        const ownershipInfo = searchOwnershipInfosResult.data.shift();
        if (ownershipInfo === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('OwnershipInfo');
        }
        // アクション
        const actionsOnOwnershipInfos = [];
        const ownedFrom = moment(ownershipInfo.ownedFrom)
            .toDate();
        try {
            // resultが所有権
            const searchSendActionsResult = yield actionService.search({
                limit: 100,
                sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
                startFrom: ownedFrom,
                // typeOf: cinerinoapi.factory.actionType.CheckAction,
                // typeOf: cinerinoapi.factory.actionType.ReturnAction,
                // typeOf: cinerinoapi.factory.actionType.SendAction,
                result: {
                    typeOf: { $in: [ownershipInfo.typeOf] },
                    id: { $in: [ownershipInfo.id] }
                }
            });
            actionsOnOwnershipInfos.push(...searchSendActionsResult.data);
            // objectが所有権
            const searchAuthorizeActionsResult = yield actionService.search({
                limit: 100,
                sort: { startDate: sdk_1.chevre.factory.sortType.Ascending },
                startFrom: ownedFrom,
                // typeOf: cinerinoapi.factory.actionType.AuthorizeAction,
                object: {
                    typeOf: { $in: [ownershipInfo.typeOf] },
                    id: { $in: [ownershipInfo.id] }
                }
            });
            actionsOnOwnershipInfos.push(...searchAuthorizeActionsResult.data);
        }
        catch (error) {
            // no op
        }
        res.json(actionsOnOwnershipInfos.map((a) => {
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
/**
 * 所有権コード発行
 */
ownershipInfosRouter.get('/:id/authorize', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authorizationService = new sdk_1.chevre.service.Authorization({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const ownershipInfoService = new sdk_1.chevre.service.OwnershipInfo({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchOwnershipInfosResult = yield ownershipInfoService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            ids: [req.params.id]
        });
        const ownershipInfo = searchOwnershipInfosResult.data.shift();
        if (ownershipInfo === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('OwnershipInfo');
        }
        const authorizations = yield authorizationService.create([{
                project: ownershipInfo.project,
                typeOf: 'Authorization',
                code: 'xxx',
                object: ownershipInfo,
                validFrom: new Date(),
                expiresInSeconds: AUTHORIZATION_EXPIRES_IN_SECONDS
            }]);
        const authorization = authorizations.shift();
        if (authorization === undefined) {
            throw new Error('authorization undefined');
        }
        const code = authorization.code;
        res.json({ code });
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
}));
exports.default = ownershipInfosRouter;
