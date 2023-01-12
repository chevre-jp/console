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
exports.aggregationsRouter = void 0;
/**
 * グローバル集計ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const moment = require("moment");
// const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
//     ? process.env.PROJECT_CREATOR_IDS.split(',')
//     : [];
const aggregationsRouter = (0, express_1.Router)();
exports.aggregationsRouter = aggregationsRouter;
aggregationsRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const aggregationService = new sdk_1.chevre.service.Aggregation({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const searchConditions = {
            limit: Number(req.query.limit),
            page: Number(req.query.page),
            aggregateStart: {
                $gte: moment()
                    .add(-1, 'year')
                    .toDate(),
                $lte: moment()
                    .toDate()
            },
            typeOf: { $eq: String(req.query.typeOf) }
        };
        if (req.query.format === 'datatable') {
            const searchResult = yield aggregationService.search(searchConditions);
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data
            });
        }
        else {
            res.render('aggregations/index', {
                layout: 'layouts/dashboard'
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
