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
 * サービスアウトプットルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const productType_1 = require("../factory/productType");
const serviceOutputsRouter = express_1.Router();
serviceOutputsRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const issuedThroughTypeOf = (_a = req.query.issuedThrough) === null || _a === void 0 ? void 0 : _a.typeOf;
    if (typeof issuedThroughTypeOf !== 'string' || issuedThroughTypeOf.length === 0) {
        res.redirect(`/projects/${req.project.id}/serviceOutputs?issuedThrough[typeOf]=${sdk_1.chevre.factory.product.ProductType.MembershipService}`);
        return;
    }
    res.render('serviceOutputs/index', {
        message: '',
        issuedThroughTypeOf
    });
}));
serviceOutputsRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const serviceOutputService = new sdk_1.chevre.service.ServiceOutput({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            typeOf: Object.assign({}, (typeof ((_c = (_b = req.query) === null || _b === void 0 ? void 0 : _b.typeOf) === null || _c === void 0 ? void 0 : _c.$eq) === 'string')
                ? { $eq: (_e = (_d = req.query) === null || _d === void 0 ? void 0 : _d.typeOf) === null || _e === void 0 ? void 0 : _e.$eq }
                : undefined),
            identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                ? { $eq: req.query.identifier }
                : undefined,
            issuedBy: {
                id: (typeof ((_g = (_f = req.query.issuedBy) === null || _f === void 0 ? void 0 : _f.id) === null || _g === void 0 ? void 0 : _g.$eq) === 'string' && req.query.issuedBy.id.$eq.length > 0)
                    ? { $eq: req.query.issuedBy.id.$eq }
                    : undefined
            },
            issuedThrough: {
                id: (typeof ((_j = (_h = req.query.issuedThrough) === null || _h === void 0 ? void 0 : _h.id) === null || _j === void 0 ? void 0 : _j.$eq) === 'string' && req.query.issuedThrough.id.$eq.length > 0)
                    ? { $eq: req.query.issuedThrough.id.$eq }
                    : undefined,
                typeOf: (typeof ((_l = (_k = req.query.issuedThrough) === null || _k === void 0 ? void 0 : _k.typeOf) === null || _l === void 0 ? void 0 : _l.$eq) === 'string' && req.query.issuedThrough.typeOf.$eq.length > 0)
                    ? { $eq: req.query.issuedThrough.typeOf.$eq }
                    : undefined
            }
        };
        const { data } = yield serviceOutputService.search(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((t) => {
                var _a;
                return Object.assign(Object.assign({}, t), { issuedThroughName: (_a = productType_1.productTypes.find((p) => { var _a; return p.codeValue === ((_a = t.issuedThrough) === null || _a === void 0 ? void 0 : _a.typeOf); })) === null || _a === void 0 ? void 0 : _a.name });
            })
        });
    }
    catch (err) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            success: false,
            count: 0,
            results: [],
            error: { message: err.message }
        });
    }
}));
exports.default = serviceOutputsRouter;
