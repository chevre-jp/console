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
const chevre = require("@chevre/api-nodejs-client");
const express_1 = require("express");
const http_status_1 = require("http-status");
const serviceOutputsRouter = express_1.Router();
serviceOutputsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('serviceOutputs/index', {
        message: ''
    });
}));
serviceOutputsRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const serviceOutputService = new chevre.service.ServiceOutput({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            typeOf: Object.assign({}, (typeof ((_b = (_a = req.query) === null || _a === void 0 ? void 0 : _a.typeOf) === null || _b === void 0 ? void 0 : _b.$eq) === 'string')
                ? { $eq: (_d = (_c = req.query) === null || _c === void 0 ? void 0 : _c.typeOf) === null || _d === void 0 ? void 0 : _d.$eq }
                : { $exists: true }),
            identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                ? { $eq: req.query.identifier }
                : undefined,
            issuedBy: {
                id: (typeof ((_f = (_e = req.query.issuedBy) === null || _e === void 0 ? void 0 : _e.id) === null || _f === void 0 ? void 0 : _f.$eq) === 'string' && req.query.issuedBy.id.$eq.length > 0)
                    ? { $eq: req.query.issuedBy.id.$eq }
                    : undefined
            },
            issuedThrough: {
                id: (typeof ((_h = (_g = req.query.issuedThrough) === null || _g === void 0 ? void 0 : _g.id) === null || _h === void 0 ? void 0 : _h.$eq) === 'string' && req.query.issuedThrough.id.$eq.length > 0)
                    ? { $eq: req.query.issuedThrough.id.$eq }
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
                return Object.assign({}, t);
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
