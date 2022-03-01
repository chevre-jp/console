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
 * 認証ルーター
 */
const express = require("express");
const user_1 = require("../user");
const authRouter = express.Router();
/**
 * サインイン
 * Cognitoからリダイレクトしてくる
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
authRouter.get('/signIn', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = new user_1.default({
            host: req.hostname,
            session: req.session
        });
        yield user.signIn(req.query.code);
        // 記憶されたリクエストURLがあれば利用する
        const originalUrl = req.session.originalUrl;
        if (typeof originalUrl === 'string' && originalUrl.length > 0) {
            res.redirect(originalUrl);
        }
        else {
            res.redirect('/');
        }
    }
    catch (error) {
        next(error);
    }
}));
/**
 * ログアウト
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
authRouter.get('/logout', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = new user_1.default({
            host: req.hostname,
            session: req.session
        });
        user.logout();
        res.redirect('/');
    }
    catch (error) {
        next(error);
    }
}));
exports.default = authRouter;
