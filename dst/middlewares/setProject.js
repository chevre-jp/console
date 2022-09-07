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
exports.setProject = void 0;
/**
 * リクエストプロジェクト設定ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express = require("express");
const setProject = express.Router();
exports.setProject = setProject;
// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use('/projects/:id', (req, _, next) => __awaiter(void 0, void 0, void 0, function* () {
    req.project = { typeOf: sdk_1.chevre.factory.organizationType.Project, id: req.params.id };
    next();
}));
