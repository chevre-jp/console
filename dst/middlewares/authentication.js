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
const user_1 = require("../user");
exports.default = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        req.user = new user_1.default({
            host: req.hostname,
            session: req.session
        });
        if (!req.user.isAuthenticated()) {
            // ログインページへリダイレクト
            // リクエストURLを記憶する
            req.session.originalUrl = req.originalUrl;
            res.redirect(req.user.generateAuthUrl());
            return;
        }
        yield req.user.retrieveProfile();
        res.locals.user = req.user;
        next();
    }
    catch (error) {
        next(error);
    }
});
