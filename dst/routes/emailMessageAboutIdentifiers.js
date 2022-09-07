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
exports.emailMessageAboutIdentifiersRouter = void 0;
/**
 * Eメールメッセージ送信タイミングルーター
 */
const express_1 = require("express");
const emailMessageAboutIdentifier_1 = require("../factory/emailMessageAboutIdentifier");
const emailMessageAboutIdentifiersRouter = (0, express_1.Router)();
exports.emailMessageAboutIdentifiersRouter = emailMessageAboutIdentifiersRouter;
emailMessageAboutIdentifiersRouter.get('', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(emailMessageAboutIdentifier_1.emailMessageAboutIdentifier);
}));
