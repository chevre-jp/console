/**
 * デフォルトルーター
 */
import * as express from 'express';

import authentication from '../middlewares/authentication';
import setProject from '../middlewares/setProject';

import authRouter from './auth';
import dashboardRouter from './dashboard';
import healthRouter from './health';
import projectsRouter from './projects';
import projectDetailRouter from './projects/detail';

const router = express.Router();

router.use('/health', healthRouter);

router.use(authRouter);
router.use(authentication);

// ダッシュボード
router.use('/', dashboardRouter);

// リクエストプロジェクト設定
router.use(setProject);

// プロジェクトルーター
router.use('/projects', projectsRouter);

// 以下、プロジェクト指定済の状態でルーティング
router.use('/projects/:id', projectDetailRouter);

export default router;
