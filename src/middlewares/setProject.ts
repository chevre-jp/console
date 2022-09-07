/**
 * リクエストプロジェクト設定ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as express from 'express';

const setProject = express.Router();

// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use(
    '/projects/:id',
    async (req, _, next) => {
        req.project = { typeOf: chevre.factory.organizationType.Project, id: req.params.id };

        next();
    }
);

export { setProject };
