/**
 * 口座ルーター
 */
import * as chevreapi from '@chevre/api-nodejs-client';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

export type IAction = chevreapi.factory.chevre.action.trade.pay.IAction | chevreapi.factory.chevre.action.trade.refund.IAction;
export interface IAccountingReoprt {
    mainEntity: IAction;
    isPartOf: {
        mainEntity: chevreapi.factory.order.IOrder;
    };
}

const accountsRouter = Router();

accountsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const accountService = new chevreapi.service.Account({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions: chevreapi.factory.account.ISearchConditions = {
                    limit: req.query.limit,
                    page: req.query.page,
                    accountNumber: {
                        $eq: (typeof req.query.accountNumber === 'string' && req.query.accountNumber.length > 0)
                            ? req.query.accountNumber
                            : undefined
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

accountsRouter.get(
    '/:accountNumber/moneyTransferActions',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        try {
            const accountService = new chevreapi.service.Account({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: chevreapi.factory.account.action.moneyTransfer.ISearchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { startDate: chevreapi.factory.sortType.Descending }
            };
            const searchResult = await accountService.searchMoneyTransferActions({
                ...searchConditions,
                accountNumber: req.params.accountNumber
            });

            res.json(searchResult.data);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

export default accountsRouter;
