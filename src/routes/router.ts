/**
 * デフォルトルーター
 */
import * as express from 'express';

import { authentication } from '../middlewares/authentication';
import { rateLimit } from '../middlewares/rateLimit';
import { setProject } from '../middlewares/setProject';

import { aggregationsRouter } from './aggregations';
import { authRouter } from './auth';
import { dashboardRouter } from './dashboard';
import { healthRouter } from './health';
import { projectsRouter } from './projects';
import { projectDetailRouter } from './projects/detail';

const router = express.Router();

router.use('/health', healthRouter);

router.use(authRouter);
router.use(authentication);

// ダッシュボード
router.use('/', dashboardRouter);

// リクエストプロジェクト設定
router.use(setProject);

// rateLimit
router.use(rateLimit);

router.use('/aggregations', aggregationsRouter);

// プロジェクトルーター
router.use('/projects', projectsRouter);

// 以下、プロジェクト指定済の状態でルーティング
router.use('/projects/:id', projectDetailRouter);

export { router };
