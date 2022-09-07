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
exports.categoryCodeSetsRouter = void 0;
/**
 * 区分分類ルーター
 */
const express_1 = require("express");
const categoryCodeSet_1 = require("../factory/categoryCodeSet");
const categoryCodeSetsRouter = (0, express_1.Router)();
exports.categoryCodeSetsRouter = categoryCodeSetsRouter;
categoryCodeSetsRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.query.format === 'datatable') {
        res.json({
            success: true,
            count: categoryCodeSet_1.categoryCodeSets.length,
            results: categoryCodeSet_1.categoryCodeSets
        });
    }
    else {
        res.json(categoryCodeSet_1.categoryCodeSets);
    }
}));
categoryCodeSetsRouter.get('/about', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('categoryCodeSets/about', { categoryCodeSets: categoryCodeSet_1.categoryCodeSets });
}));
