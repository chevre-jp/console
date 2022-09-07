"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
/**
 * デフォルトルーター
 */
const express = require("express");
const authentication_1 = require("../middlewares/authentication");
const setProject_1 = require("../middlewares/setProject");
const auth_1 = require("./auth");
const dashboard_1 = require("./dashboard");
const health_1 = require("./health");
const projects_1 = require("./projects");
const detail_1 = require("./projects/detail");
const router = express.Router();
exports.router = router;
router.use('/health', health_1.healthRouter);
router.use(auth_1.authRouter);
router.use(authentication_1.default);
// ダッシュボード
router.use('/', dashboard_1.dashboardRouter);
// リクエストプロジェクト設定
router.use(setProject_1.setProject);
// プロジェクトルーター
router.use('/projects', projects_1.projectsRouter);
// 以下、プロジェクト指定済の状態でルーティング
router.use('/projects/:id', detail_1.projectDetailRouter);
