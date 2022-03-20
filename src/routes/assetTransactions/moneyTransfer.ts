/**
 * 通貨転送取引ルーター
 */
import { chevre, factory } from '@cinerino/sdk';
import * as createDebug from 'debug';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import * as Message from '../../message';

import * as TimelineFactory from '../../factory/timeline';

const debug = createDebug('chevre-console:router');
const moneyTransferAssetTransactionsRouter = express.Router();

/**
 * 取引検索
 */
moneyTransferAssetTransactionsRouter.get(
    '/',
    async (req, res, next) => {
        try {
            const assetTransactionService = new chevre.service.AssetTransaction({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions:
                    chevre.factory.assetTransaction.ISearchConditions<chevre.factory.assetTransactionType.MoneyTransfer> = {
                    limit: req.query.limit,
                    page: req.query.page,
                    sort: { startDate: chevre.factory.sortType.Descending },
                    typeOf: chevre.factory.assetTransactionType.MoneyTransfer,
                    transactionNumber: {
                        $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                            ? req.query.transactionNumber
                            : undefined
                    }
                };
                const searchResult =
                    await assetTransactionService.search<chevre.factory.assetTransactionType.MoneyTransfer>(searchConditions);

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((d) => {
                        return {
                            ...d
                            // numSubReservation: (Array.isArray(d.object.subReservation))
                            //     ? d.object.subReservation.length
                            //     : 0
                        };
                    })
                });
            } else {
                res.render('assetTransactions/moneyTransfer/index', {
                    moment: moment,
                    query: req.query,
                    ActionStatusType: chevre.factory.actionStatusType
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

moneyTransferAssetTransactionsRouter.get(
    '/:transactionId/actions',
    async (req, res) => {
        try {
            const actionService = new chevre.service.Action({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchActionsByObjectResult = await actionService.search({
                object: {
                    id: { $eq: req.params.transactionId }
                },
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            const searchActionsByPurposeResult = await actionService.search({
                purpose: {
                    id: { $in: [req.params.transactionId] }
                },
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            res.json([
                ...searchActionsByObjectResult.data,
                ...searchActionsByPurposeResult.data
            ]
                .sort((a, b) => {
                    return (moment(a.startDate)
                        .isAfter(b.startDate))
                        ? 1
                        : -1;
                })
                .map((a) => {
                    return {
                        ...a,
                        timeline: TimelineFactory.createFromAction({
                            project: { id: req.project.id },
                            action: a
                        })
                    };
                }));
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

/**
 * 取引開始
 */
// tslint:disable-next-line:use-default-type-parameter
moneyTransferAssetTransactionsRouter.all<ParamsDictionary>(
    '/start',
    ...validate(),
    async (req, res, next) => {
        try {
            let values: any = {};
            let message = '';
            let errors: any = {};

            if (req.method === 'POST') {
                values = req.body;

                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
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
            }

            res.render('assetTransactions/moneyTransfer/start', {
                values: values,
                message: message,
                errors: errors
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
            const transaction = <chevre.factory.assetTransaction.moneyTransfer.ITransaction | undefined>(<Express.Session>req.session)[`assetTransaction:${req.params.transactionId}`];
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
                const permitService = new chevre.service.Permit({
                    endpoint: <string>process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                const accountTransactionType = transaction.object.pendingTransaction?.typeOf;
                if (accountTransactionType === chevre.factory.account.transactionType.Withdraw
                    || accountTransactionType === chevre.factory.account.transactionType.Transfer) {
                    const searchPermitsResult = await permitService.search({
                        identifier: { $eq: String(transaction.object.fromLocation?.identifier) },
                        issuedThrough: {
                            id: {
                                // tslint:disable-next-line:max-line-length
                                $eq: (<chevre.factory.action.transfer.moneyTransfer.IPaymentCard>transaction.object.fromLocation).issuedThrough.id
                            }
                        },
                        limit: 1
                    });
                    fromPermit = searchPermitsResult.data.shift();
                    if (fromPermit === undefined) {
                        throw new Error('From Location Not Found');
                    }
                }

                if (accountTransactionType === chevre.factory.account.transactionType.Deposit
                    || accountTransactionType === chevre.factory.account.transactionType.Transfer) {
                    const searchPermitsResult = await permitService.search({
                        identifier: { $eq: String(transaction.object.toLocation.identifier) },
                        issuedThrough: {
                            id: {
                                // tslint:disable-next-line:max-line-length
                                $eq: (<chevre.factory.action.transfer.moneyTransfer.IPaymentCard>transaction.object.toLocation).issuedThrough.id
                            }
                        },
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

function validate() {
    return [
        body('issuedThrough.id')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'サービス'))
    ];
}

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createMoneyTransferStartParams(
    req: express.Request
): Promise<chevre.factory.assetTransaction.moneyTransfer.IStartParamsBeforeStart> {
    let fromPermit: chevre.factory.permit.IPermit | string | undefined;
    let toPermit: chevre.factory.permit.IPermit | undefined;
    const issuedThroughId = String(req.body.issuedThrough?.id);

    const tokenService = new chevre.service.Token({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    // ペイメントカードプロダクトを検索
    const productService = new chevre.service.Product({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchProductsResult = await productService.search({
        limit: 1,
        id: { $eq: issuedThroughId },
        typeOf: { $eq: chevre.factory.product.ProductType.PaymentCard }
    });
    const product = <chevre.factory.product.IProduct | undefined>searchProductsResult.data.shift();
    if (product === undefined) {
        throw new Error(`Product: ${issuedThroughId} not found`);
    }

    const permitService = new chevre.service.Permit({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const accountTransactionType = req.body.transactionType;
    if (accountTransactionType === chevre.factory.account.transactionType.Withdraw
        || accountTransactionType === chevre.factory.account.transactionType.Transfer) {
        if (typeof req.body.fromLocationCode === 'string' && req.body.fromLocationCode.length > 0) {
            fromPermit = String(req.body.fromLocationCode);
        } else {
            const searchPermitsResult = await permitService.search({
                identifier: { $eq: String(req.body.fromPermitIdentifier) },
                issuedThrough: { id: { $eq: issuedThroughId } },
                limit: 1
            });
            fromPermit = searchPermitsResult.data.shift();
        }

        if (fromPermit === undefined) {
            throw new Error('From Location Not Found');
        }
    }

    if (accountTransactionType === chevre.factory.account.transactionType.Deposit) {
        const searchPermitsResult = await permitService.search({
            identifier: { $eq: String(req.body.toPermitIdentifier) },
            issuedThrough: { id: { $eq: issuedThroughId } },
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
        currency: String(product.serviceOutput?.amount?.currency)
    };
    const description: string | undefined = (typeof req.body.description === 'string' && req.body.description.length > 0)
        ? req.body.description
        : undefined;

    let startParams: chevre.factory.assetTransaction.moneyTransfer.IStartParamsBeforeStart;

    switch (req.body.transactionType) {
        case chevre.factory.account.transactionType.Deposit:
            const toLocation4deposit: chevre.factory.action.transfer.moneyTransfer.IPaymentCard = {
                typeOf: chevre.factory.permit.PermitType.Permit,
                identifier: req.body.toPermitIdentifier,
                issuedThrough: { id: issuedThroughId }
            };

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
                    toLocation: toLocation4deposit,
                    ...(typeof description === 'string') ? { description } : undefined
                }
            };

            break;

        case chevre.factory.account.transactionType.Transfer:
            let fromLocation4transfer: chevre.factory.action.transfer.moneyTransfer.IPaymentCard | string;
            // トークンに対応
            if ((typeof req.body.fromLocationCode === 'string' && req.body.fromLocationCode.length > 0)) {
                const { token } = await tokenService.getToken({ code: req.body.fromLocationCode });
                fromLocation4transfer = token;
            } else {
                fromLocation4transfer = {
                    typeOf: chevre.factory.permit.PermitType.Permit,
                    identifier: req.body.fromPermitIdentifier,
                    issuedThrough: { id: issuedThroughId }
                };
            }

            const toLocation4transfer: chevre.factory.action.transfer.moneyTransfer.IPaymentCard = {
                typeOf: chevre.factory.permit.PermitType.Permit,
                identifier: req.body.toPermitIdentifier,
                issuedThrough: { id: issuedThroughId }
            };

            startParams = {
                project: req.project,
                typeOf: chevre.factory.assetTransactionType.MoneyTransfer,
                expires,
                agent,
                recipient,
                object: {
                    pendingTransaction: { typeOf: req.body.transactionType, id: '' },
                    amount,
                    fromLocation: fromLocation4transfer,
                    toLocation: toLocation4transfer,
                    ...(typeof description === 'string') ? { description } : undefined
                }
            };

            break;

        case chevre.factory.account.transactionType.Withdraw:
            let fromLocation4withdraw: chevre.factory.action.transfer.moneyTransfer.IPaymentCard | string;
            // トークンに対応
            if ((typeof req.body.fromLocationCode === 'string' && req.body.fromLocationCode.length > 0)) {
                const { token } = await tokenService.getToken({ code: req.body.fromLocationCode });
                fromLocation4withdraw = token;
            } else {
                fromLocation4withdraw = {
                    typeOf: chevre.factory.permit.PermitType.Permit,
                    identifier: req.body.fromPermitIdentifier,
                    issuedThrough: { id: issuedThroughId }
                };
            }

            startParams = {
                project: req.project,
                typeOf: chevre.factory.assetTransactionType.MoneyTransfer,
                expires,
                agent,
                recipient,
                object: {
                    pendingTransaction: { typeOf: req.body.transactionType, id: '' },
                    amount,
                    fromLocation: fromLocation4withdraw,
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
