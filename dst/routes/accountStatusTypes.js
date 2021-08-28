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
 * 口座ステータスルーター
 */
const express_1 = require("express");
const accountStatusType_1 = require("../factory/accountStatusType");
const accountStatusTypesRouter = express_1.Router();
accountStatusTypesRouter.get('', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(accountStatusType_1.accountStatusTypes);
}));
exports.default = accountStatusTypesRouter;
