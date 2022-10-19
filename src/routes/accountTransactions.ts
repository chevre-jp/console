/**
 * 口座取引ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

const accountTransactionsRouter = Router();

accountTransactionsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res, next) => {
        try {
            const accountTransactionService = new chevre.service.AccountTransaction({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions: chevre.factory.account.transaction.ISearchConditions = {
                    limit: req.query.limit,
                    page: req.query.page,
                    sort: { startDate: chevre.factory.sortType.Descending },
                    object: {
                        location: {
                            accountNumber: {
                                $eq: (typeof req.query.location?.accountNumber === 'string' && req.query.location.accountNumber.length > 0)
                                    ? req.query.location.accountNumber
                                    : undefined
                            }
                        }
                    },
                    typeOf: {
                        $eq: (typeof req.query.typeOf === 'string' && req.query.typeOf.length > 0)
                            ? req.query.typeOf
                            : undefined
                    },
                    transactionNumber: {
                        $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                            ? req.query.transactionNumber
                            : undefined
                    },
                    identifier: {
                        $eq: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                            ? req.query.identifier
                            : undefined
                    }
                };
                const searchResult = await accountTransactionService.search({
                    ...searchConditions,
                    issuedThrough: { id: req.query.issuedThrough?.id }
                });

                searchResult.data = searchResult.data.map((accountTransaction) => {
                    let currency: string;
                    if (accountTransaction.typeOf === chevre.factory.account.transactionType.Deposit) {
                        currency = accountTransaction.object.toLocation.accountType;
                    } else {
                        currency = accountTransaction.object.fromLocation.accountType;
                    }

                    return {
                        ...accountTransaction,
                        currency
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
                res.render('accountTransactions/index', {
                    moment: moment,
                    query: req.query,
                    AccountTransactionType: chevre.factory.account.transactionType
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

export { accountTransactionsRouter };
