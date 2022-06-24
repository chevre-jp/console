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
exports.hubRouter = void 0;
/**
 * HUBルーター
 */
const express = require("express");
const moment = require("moment");
const request = require("request-promise-native");
const hubRouter = express.Router();
exports.hubRouter = hubRouter;
hubRouter.get('/chevres', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (req.query.format === 'datatable') {
            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const searchConditions = {
                limit: limit,
                page: page,
                id: {
                    $eq: (typeof ((_a = req.query.id) === null || _a === void 0 ? void 0 : _a.$eq) === 'string' && req.query.id.$eq.length > 0)
                        ? req.query.id.$eq
                        : undefined
                }
            };
            const chevres = yield request.get(`${process.env.HUB_ENDPOINT}/chevres`, { json: true, qs: searchConditions })
                .promise();
            res.json({
                success: true,
                count: (chevres.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(chevres.length),
                results: chevres.map((chevre) => {
                    return Object.assign({}, chevre);
                })
            });
        }
        else {
            res.render('hub/chevres', {
                moment: moment
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
