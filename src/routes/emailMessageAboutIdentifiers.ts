/**
 * Eメールメッセージ送信タイミングルーター
 */
import { Router } from 'express';

import { emailMessageAboutIdentifier } from '../factory/emailMessageAboutIdentifier';

const emailMessageAboutIdentifiersRouter = Router();

emailMessageAboutIdentifiersRouter.get(
    '',
    async (_, res) => {
        res.json(emailMessageAboutIdentifier);
    }
);

export { emailMessageAboutIdentifiersRouter };
