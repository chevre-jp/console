/**
 * 区分分類ルーター
 */
import { Router } from 'express';

import { categoryCodeSets } from '../factory/categoryCodeSet';

const categoryCodeSetsRouter = Router();

categoryCodeSetsRouter.get(
    '',
    async (req, res) => {
        if (req.query.format === 'datatable') {
            res.json({
                success: true,
                count: categoryCodeSets.length,
                results: categoryCodeSets
            });
        } else {
            res.json(categoryCodeSets);
        }
    }
);

categoryCodeSetsRouter.get(
    '/about',
    async (_, res) => {
        res.render('categoryCodeSets/about', { categoryCodeSets });
    }
);

export { categoryCodeSetsRouter };
