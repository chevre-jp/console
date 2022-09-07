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
exports.waiterRouter = void 0;
/**
 * Waiterルーター
 */
const express = require("express");
const moment = require("moment");
const request = require("request-promise-native");
const waiterRouter = express.Router();
exports.waiterRouter = waiterRouter;
waiterRouter.get('/rules', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.query.format === 'datatable') {
            const rules = yield request.get(`${process.env.WAITER_ENDPOINT}/projects/${req.project.id}/rules`, { json: true })
                .promise();
            res.json({
                success: true,
                count: rules.length,
                results: rules.map((rule) => {
                    return Object.assign(Object.assign({}, rule), { numAvailableHoursSpecifications: (Array.isArray(rule.availableHoursSpecifications))
                            ? rule.availableHoursSpecifications.length
                            : 0, numUnavailableHoursSpecifications: (Array.isArray(rule.unavailableHoursSpecifications))
                            ? rule.unavailableHoursSpecifications.length
                            : 0 });
                })
            });
        }
        else {
            res.render('waiter/rules', {
                moment: moment
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
