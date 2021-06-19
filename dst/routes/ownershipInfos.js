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
const moment = require("moment");
const orderStatusType_1 = require("../factory/orderStatusType");
const ownershipInfosRouter = express_1.Router();
ownershipInfosRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('ownershipInfos/index', {
        message: '',
        orderStatusTypes: orderStatusType_1.orderStatusTypes
    });
}));
ownershipInfosRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
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
                        : undefined
                }
            }
        };
        const { data } = yield ownershipInfoService.search(searchConditions);
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
exports.default = ownershipInfosRouter;
