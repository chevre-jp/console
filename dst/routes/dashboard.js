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
 * ダッシュボードルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const ITEMS_ON_PAGE = 10;
const dashboardRouter = express_1.Router();
/**
 * ダッシュボード
 */
dashboardRouter.get('', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // if (req.query.next !== undefined) {
        //     next(new Error(req.param('next')));
        //     return;
        // }
        // 管理プロジェクト検索
        const meService = new sdk_1.chevre.service.Me({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const { data } = yield meService.searchProjects({ limit: 2 });
        // プロジェクトが1つのみであれば、プロジェクトホームへ自動遷移
        if (data.length === 1) {
            res.redirect(`/dashboard/projects/${data[0].id}/select`);
            return;
        }
        const searchProjectsResult = yield meService.searchProjects({ limit: ITEMS_ON_PAGE });
        const hasMoreProjects = searchProjectsResult.data.length >= ITEMS_ON_PAGE;
        res.render('dashboard', { layout: 'layouts/dashboard', hasMoreProjects });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * プロジェクト検索
 */
dashboardRouter.get('/dashboard/projects', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 管理プロジェクト検索
        const meService = new sdk_1.chevre.service.Me({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        const searchProjectsResult = yield meService.searchProjects({ limit: ITEMS_ON_PAGE });
        res.json(searchProjectsResult);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .send(error.message);
    }
}));
/**
 * プロジェクト選択
 */
dashboardRouter.get('/dashboard/projects/:id/select', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projectId = req.params.id;
        try {
            const chevreProjectService = new sdk_1.chevre.service.Project({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });
            yield chevreProjectService.findById({ id: projectId });
        }
        catch (error) {
            // プロジェクト未作成であれば初期化プロセスへ
            if (error.code === http_status_1.NOT_FOUND) {
                res.redirect(`/projects/${projectId}/initialize`);
                return;
            }
            throw error;
        }
        res.redirect(`/projects/${projectId}/home`);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = dashboardRouter;
