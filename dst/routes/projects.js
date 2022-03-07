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
 * プロジェクトルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const settings_1 = require("./settings");
const debug = createDebug('chevre-backend:routes');
const PROJECT_CREATOR_IDS = (typeof process.env.PROJECT_CREATOR_IDS === 'string')
    ? process.env.PROJECT_CREATOR_IDS.split(',')
    : [];
const projectsRouter = express_1.Router();
/**
 * 検索
 */
projectsRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        debug('req.query:', req.query);
        // 管理プロジェクト検索
        const meService = new sdk_1.chevre.service.Me({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            ids: (typeof req.query.id === 'string' && req.query.id.length > 0) ? [req.query.id] : undefined,
            name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
        };
        debug('searchConditions:', searchConditions);
        if (req.query.format === 'datatable') {
            const searchResult = yield meService.searchProjects(searchConditions);
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data.map((d) => {
                    return Object.assign({}, d);
                })
            });
        }
        else {
            res.render('projects/index', {
                layout: 'layouts/dashboard',
                searchConditions: searchConditions
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:use-default-type-parameter
projectsRouter.all('/new', ...settings_1.validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 特定のユーザーにのみ許可
        if (!PROJECT_CREATOR_IDS.includes(req.user.profile.sub)) {
            throw new sdk_1.chevre.factory.errors.Forbidden('not project creator');
        }
        let message = '';
        let errors = {};
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                // 登録プロセス
                try {
                    let project = yield settings_1.createFromBody(req, true);
                    project = yield projectService.create(project);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${project.id}/settings`);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign({ settings: {} }, req.body);
        if (req.method === 'POST') {
            // no op
        }
        else {
            // no op
        }
        res.render('projects/new', {
            layout: 'layouts/dashboard',
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * プロジェクト初期化
 */
// tslint:disable-next-line:use-default-type-parameter
projectsRouter.get('/:id/initialize', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.redirect(`/projects/${req.params.id}/home`);
    }
    catch (err) {
        next(err);
    }
}));
exports.default = projectsRouter;
