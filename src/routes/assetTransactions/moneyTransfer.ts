/**
 * 通貨転送取引ルーター
 */
import { chevre, factory } from '@cinerino/sdk';
import * as createDebug from 'debug';
import * as express from 'express';
import * as moment from 'moment';

const debug = createDebug('chevre-console:router');
const moneyTransferAssetTransactionsRouter = express.Router();

/**
 * 取引検索
 */
moneyTransferAssetTransactionsRouter.get(
    '/',
    async (req, _, next) => {
        try {
            debug('searching transactions...', req.query);
            throw new Error('Not implemented');
        } catch (error) {
            next(error);
        }
    });

/**
 * 取引開始
 */
moneyTransferAssetTransactionsRouter.all(
    '/start',
    async (req, res, next) => {
        try {
            let values: any = {};
            let message = '';
            if (req.method === 'POST') {
                values = req.body;

                try {
                    let transaction: chevre.factory.assetTransaction.moneyTransfer.ITransaction;

                    const moneyTransferService = new chevre.service.assetTransaction.MoneyTransfer({
                        endpoint: <string>process.env.API_ENDPOINT,
                        auth: req.user.authClient,
                        project: { id: req.project.id }
                    });

                    switch (req.body.transactionType) {
                        case chevre.factory.account.transactionType.Deposit:
                        case chevre.factory.account.transactionType.Transfer:
                        case chevre.factory.account.transactionType.Withdraw:
                            const startParams = await createMoneyTransferStartParams(req);
                            transaction = await moneyTransferService.start(startParams);

                            break;

                        default:
                            throw new Error(`Transaction type ${req.body.transactionType} not implemented`);
                    }

                    // セッションに取引追加
                    (<Express.Session>req.session)[`assetTransaction:${transaction.id}`] = transaction;

                    res.redirect(`/projects/${req.project.id}/assetTransactions/${chevre.factory.assetTransactionType.MoneyTransfer}/${transaction.id}/confirm`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }

            res.render('assetTransactions/moneyTransfer/start', {
                values: values,
                message: message
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引確認
 */
moneyTransferAssetTransactionsRouter.all(
    '/:transactionId/confirm',
    async (req, res, next) => {
        try {
            let message;
            let fromPermit: chevre.factory.permit.IPermit | undefined;
            let toPermit: chevre.factory.permit.IPermit | undefined;
            const transaction = (<Express.Session>req.session)[`assetTransaction:${req.params.transactionId}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            if (req.method === 'POST') {
                const moneyTransferService = new chevre.service.assetTransaction.MoneyTransfer({
                    endpoint: <string>process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });

                // 確定
                switch (transaction.object?.pendingTransaction?.typeOf) {
                    case chevre.factory.account.transactionType.Deposit:
                    case chevre.factory.account.transactionType.Transfer:
                    case chevre.factory.account.transactionType.Withdraw:
                        await moneyTransferService.confirm(transaction);

                        break;

                    default:
                        throw new Error(`Transaction type ${req.body.transactionType} not implemented`);
                }

                debug('取引確定です。');
                message = '取引を実行しました。';
                // セッション削除
                // tslint:disable-next-line:no-dynamic-delete
                delete (<Express.Session>req.session)[`assetTransaction:${req.params.transactionId}`];
                req.flash('message', '取引を実行しました。');
                res.redirect(`/projects/${req.project.id}/assetTransactions/${chevre.factory.assetTransactionType.MoneyTransfer}/start`);

                return;
            } else {
                // 転送元、転送先ペイメントカード情報を検索
                const serviceOutputService = new chevre.service.ServiceOutput({
                    endpoint: <string>process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                const accountTransactionType = transaction.object.pendingTransaction.typeOf;
                if (accountTransactionType === chevre.factory.account.transactionType.Withdraw
                    || accountTransactionType === chevre.factory.account.transactionType.Transfer) {
                    const searchPermitsResult = await serviceOutputService.search({
                        identifier: { $eq: transaction.object.fromLocation.identifier },
                        limit: 1
                    });
                    fromPermit = searchPermitsResult.data.shift();
                    if (fromPermit === undefined) {
                        throw new Error('From Location Not Found');
                    }
                }

                if (accountTransactionType === chevre.factory.account.transactionType.Deposit
                    || accountTransactionType === chevre.factory.account.transactionType.Transfer) {
                    const searchPermitsResult = await serviceOutputService.search({
                        identifier: { $eq: transaction.object.toLocation.identifier },
                        limit: 1
                    });
                    toPermit = searchPermitsResult.data.shift();
                    if (toPermit === undefined) {
                        throw new Error('To Location Not Found');
                    }
                }
            }

            res.render('assetTransactions/moneyTransfer/confirm', {
                transaction: transaction,
                message: message,
                fromPermit,
                toPermit
            });
        } catch (error) {
            next(error);
        }
    }
);

// tslint:disable-next-line:max-func-body-length
async function createMoneyTransferStartParams(
    req: express.Request
): Promise<chevre.factory.assetTransaction.moneyTransfer.IStartParamsWithoutDetail> {
    let fromPermit: chevre.factory.permit.IPermit | undefined;
    let toPermit: chevre.factory.permit.IPermit | undefined;
    const serviceOutputService = new chevre.service.ServiceOutput({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const accountTransactionType = req.body.transactionType;
    if (accountTransactionType === chevre.factory.account.transactionType.Withdraw
        || accountTransactionType === chevre.factory.account.transactionType.Transfer) {
        const searchPermitsResult = await serviceOutputService.search({
            identifier: { $eq: String(req.body.fromPermitIdentifier) },
            limit: 1
        });
        fromPermit = searchPermitsResult.data.shift();
        if (fromPermit === undefined) {
            throw new Error('From Location Not Found');
        }
    }

    if (accountTransactionType === chevre.factory.account.transactionType.Deposit) {
        const searchPermitsResult = await serviceOutputService.search({
            identifier: { $eq: String(req.body.toPermitIdentifier) },
            limit: 1
        });
        toPermit = searchPermitsResult.data.shift();
        if (toPermit === undefined) {
            throw new Error('To Location Not Found');
        }
    }

    const expires = moment()
        .add(1, 'minutes')
        .toDate();
    const agent = {
        typeOf: chevre.factory.personType.Person,
        id: req.user.profile.sub,
        name: req.body.fromName
    };
    const recipient = {
        typeOf: chevre.factory.personType.Person,
        id: '',
        name: req.body.recipientName
    };
    const amount: factory.monetaryAmount.IMonetaryAmount = {
        typeOf: 'MonetaryAmount',
        value: Number(req.body.amount),
        currency: (fromPermit !== undefined)
            ? String(fromPermit.amount?.currency)
            : String(toPermit?.amount?.currency)
    };
    const description: string | undefined = (typeof req.body.description === 'string' && req.body.description.length > 0)
        ? req.body.description
        : undefined;

    let startParams: chevre.factory.assetTransaction.moneyTransfer.IStartParamsWithoutDetail;

    switch (req.body.transactionType) {
        case chevre.factory.account.transactionType.Deposit:
            startParams = {
                project: req.project,
                typeOf: chevre.factory.assetTransactionType.MoneyTransfer,
                expires,
                agent,
                recipient,
                object: {
                    pendingTransaction: { typeOf: req.body.transactionType, id: '' },
                    amount,
                    fromLocation: {
                        typeOf: chevre.factory.personType.Person,
                        name: req.body.fromName
                    },
                    toLocation: {
                        typeOf: 'Permit',
                        identifier: req.body.toPermitIdentifier
                    },
                    ...(typeof description === 'string') ? { description } : undefined
                }
            };

            break;

        case chevre.factory.account.transactionType.Transfer:
            startParams = {
                project: req.project,
                typeOf: chevre.factory.assetTransactionType.MoneyTransfer,
                expires,
                agent,
                recipient,
                object: {
                    pendingTransaction: { typeOf: req.body.transactionType, id: '' },
                    amount,
                    fromLocation: {
                        typeOf: 'Permit',
                        identifier: req.body.fromPermitIdentifier
                    },
                    toLocation: {
                        typeOf: 'Permit',
                        identifier: req.body.toPermitIdentifier
                    },
                    ...(typeof description === 'string') ? { description } : undefined
                }
            };

            break;

        case chevre.factory.account.transactionType.Withdraw:
            startParams = {
                project: req.project,
                typeOf: chevre.factory.assetTransactionType.MoneyTransfer,
                expires,
                agent,
                recipient,
                object: {
                    pendingTransaction: { typeOf: req.body.transactionType, id: '' },
                    amount,
                    fromLocation: {
                        typeOf: 'Permit',
                        identifier: req.body.fromPermitIdentifier
                    },
                    toLocation: {
                        typeOf: chevre.factory.personType.Person,
                        name: req.body.recipientName
                    },
                    ...(typeof description === 'string') ? { description } : undefined
                }
            };

            break;

        default:
            throw new Error(`Transaction type ${req.body.transactionType} not implemented`);
    }

    return startParams;
}

export default moneyTransferAssetTransactionsRouter;
