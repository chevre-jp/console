/**
 * 口座ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

const accountsRouter = Router();

accountsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res, next) => {
        try {
            const accountService = new chevre.service.Account({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions: chevre.factory.account.ISearchConditions = {
                    limit: req.query.limit,
                    page: req.query.page,
                    accountType: (typeof req.query.accountType === 'string' && req.query.accountType.length > 0)
                        ? req.query.accountType
                        : undefined,
                    statuses: (typeof req.query.status === 'string' && req.query.status.length > 0)
                        ? [req.query.status]
                        : undefined,
                    accountNumber: {
                        $regex: (typeof req.query.accountNumber === 'string' && req.query.accountNumber.length > 0)
                            ? req.query.accountNumber
                            : undefined
                    },
                    name: {
                        $regex: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
                    }
                };
                const searchResult = await accountService.search(searchConditions);

                searchResult.data = searchResult.data.map((a) => {

                    return {
                        ...a
                    };
                });

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data
                });
            } else {
                res.render('accounts/index', {
                    moment: moment,
                    query: req.query
                });
            }
        } catch (error) {
            if (req.query.format === 'datatable') {
                res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                    .json({ message: error.message });
            } else {
                next(error);
            }
        }
    }
);

export { accountsRouter };
