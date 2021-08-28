/**
 * 口座ステータスルーター
 */
import { Router } from 'express';

import { accountStatusTypes } from '../factory/accountStatusType';

const accountStatusTypesRouter = Router();

accountStatusTypesRouter.get(
    '',
    async (_, res) => {
        res.json(accountStatusTypes);
    }
);

export default accountStatusTypesRouter;
