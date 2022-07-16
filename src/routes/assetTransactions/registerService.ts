/**
 * サービス登録取引ルーター
 */
import { chevre } from '@cinerino/sdk';
// import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

// const debug = createDebug('chevre-console:router');
const registerServiceTransactionsRouter = express.Router();

/**
 * 取引検索
 */
registerServiceTransactionsRouter.get(
    '/',
    async (req, res, next) => {
        try {
            const assetTransactionService = new chevre.service.AssetTransaction({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const searchConditions
                    : chevre.factory.assetTransaction.ISearchConditions<chevre.factory.assetTransactionType.RegisterService> = {
                    limit: req.query.limit,
                    page: req.query.page,
                    sort: { startDate: chevre.factory.sortType.Descending },
                    typeOf: chevre.factory.assetTransactionType.RegisterService,
                    transactionNumber: {
                        $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                            ? req.query.transactionNumber
                            : undefined
                    }
                };
                const searchResult
                    = await assetTransactionService.search<chevre.factory.assetTransactionType.RegisterService>(searchConditions);

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((d) => {
                        return {
                            ...d,
                            numObjects: (Array.isArray(d.object))
                                ? d.object.length
                                : 0
                        };
                    })
                });
            } else {
                res.render('assetTransactions/registerService/index', {
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

/**
 * サービス登録取引開始
 */
registerServiceTransactionsRouter.all(
    '/start',
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            let values: any = {};
            let message = '';

            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const registerService = new chevre.service.assetTransaction.RegisterService({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const permitService = new chevre.service.Permit({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const transactionNumberService = new chevre.service.TransactionNumber({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const product = <chevre.factory.product.IProduct>await productService.findById({ id: req.query.product });
            const offers = await productService.searchOffers({ id: String(product.id) });
            const selectedOffer = offers[0];
            if (selectedOffer === undefined) {
                throw new Error('selectedOffer undefined');
            }

            if (req.method === 'POST') {
                values = req.body;

                try {
                    const serviceOutputName: string | undefined = req.body.serviceOutput?.name;
                    const numOutputs = (typeof req.body.numOutputs === 'string' && req.body.numOutputs.length > 0)
                        ? Number(req.body.numOutputs)
                        : 1;

                    const seller = await sellerService.findById({ id: req.body.serviceOutput?.issuedBy?.id });
                    const issuedBy: chevre.factory.organization.IOrganization = {
                        // project: seller.project,
                        id: seller.id,
                        name: seller.name,
                        typeOf: seller.typeOf
                    };

                    let acceptedOffer: chevre.factory.assetTransaction.registerService.IAcceptedOffer[];

                    // tslint:disable-next-line:prefer-array-literal
                    acceptedOffer = [...Array(Number(numOutputs))].map(() => {
                        return {
                            typeOf: chevre.factory.offerType.Offer,
                            id: <string>selectedOffer.id,
                            itemOffered: {
                                id: product.id,
                                project: product.project,
                                serviceOutput: {
                                    issuedBy: issuedBy,
                                    name: (typeof serviceOutputName === 'string' && serviceOutputName.length > 0)
                                        ? serviceOutputName
                                        : undefined,
                                    project: product.project,
                                    typeOf: chevre.factory.permit.PermitType.Permit
                                },
                                typeOf: product.typeOf
                            }
                        };
                    });

                    const expires = moment()
                        .add(1, 'minutes')
                        .toDate();

                    let object: chevre.factory.assetTransaction.registerService.IObjectWithoutDetail = acceptedOffer;
                    object = await createServiceOutputIdentifier({ acceptedOffer, product })({
                        permitService: permitService
                    });

                    const { transactionNumber } = await transactionNumberService.publish({
                        project: { id: req.project.id }
                    });

                    const transaction = await registerService.start({
                        project: { typeOf: req.project.typeOf, id: req.project.id },
                        typeOf: chevre.factory.assetTransactionType.RegisterService,
                        transactionNumber: transactionNumber,
                        expires: expires,
                        agent: {
                            typeOf: chevre.factory.personType.Person,
                            id: req.user.profile.sub,
                            name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                        },
                        object: object
                    });

                    // 確認画面へ情報を引き継ぐ
                    // セッションに取引追加
                    (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`] = transaction;

                    res.redirect(`/projects/${req.project.id}/assetTransactions/${transaction.typeOf}/${transaction.transactionNumber}/confirm`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }

            const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

            res.render('assetTransactions/registerService/start', {
                values: values,
                message: message,
                moment: moment,
                product: product,
                sellers: searchSellersResult.data
            });
        } catch (error) {
            next(error);
        }
    }
);

function createServiceOutputIdentifier(params: {
    acceptedOffer: chevre.factory.assetTransaction.registerService.IObjectWithoutDetail;
    product: chevre.factory.product.IProduct;
}) {
    return async (repos: {
        permitService: chevre.service.Permit;
    }): Promise<chevre.factory.assetTransaction.registerService.IObjectWithoutDetail> => {
        const publishParams = params.acceptedOffer.map(() => {
            return { project: { id: params.product.project.id } };
        });
        const publishIdentifierResult = await repos.permitService.publishIdentifier(publishParams);

        // 識別子を発行
        return Promise.all(params.acceptedOffer.map(async (o, key) => {
            return {
                ...o,
                itemOffered: {
                    ...o.itemOffered,
                    serviceOutput: {
                        ...o.itemOffered?.serviceOutput,
                        accessCode: createAccessCode(),
                        project: params.product.project,
                        typeOf: chevre.factory.permit.PermitType.Permit,
                        identifier: publishIdentifierResult[key].identifier
                    }
                }
            };
        }));
    };
}

function createAccessCode() {
    // tslint:disable-next-line:insecure-random no-magic-numbers
    return String(Math.floor((Math.random() * 9000) + 1000));
}

/**
 * 予約取引確認
 */
registerServiceTransactionsRouter.all(
    '/:transactionNumber/confirm',
    async (req, res, next) => {
        try {
            let message = '';

            const transaction = <chevre.factory.assetTransaction.registerService.ITransaction>
                (<Express.Session>req.session)[`transaction:${req.params.transactionNumber}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const registerService = new chevre.service.assetTransaction.RegisterService({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const productId = transaction.object[0].itemOffered?.id;
            if (typeof productId !== 'string') {
                throw new chevre.factory.errors.NotFound('Product not specified');
            }

            if (req.method === 'POST') {
                // 確定
                await registerService.confirm({ transactionNumber: transaction.transactionNumber });
                message = 'サービス登録取引を確定しました';
                // セッション削除
                // tslint:disable-next-line:no-dynamic-delete
                delete (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`];
                req.flash('message', message);
                res.redirect(`/projects/${req.project.id}/assetTransactions/${chevre.factory.assetTransactionType.RegisterService}/start?product=${productId}`);

                return;
            } else {
                const product = await productService.findById({ id: productId });

                res.render('assetTransactions/registerService/confirm', {
                    transaction: transaction,
                    moment: moment,
                    message: message,
                    product: product
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引中止
 */
registerServiceTransactionsRouter.all(
    '/:transactionNumber/cancel',
    async (req, res, next) => {
        try {
            let message = '';

            const transaction = <chevre.factory.assetTransaction.registerService.ITransaction>
                (<Express.Session>req.session)[`transaction:${req.params.transactionNumber}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            const registerService = new chevre.service.assetTransaction.RegisterService({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const productId = transaction.object[0].itemOffered?.id;
            if (typeof productId !== 'string') {
                throw new chevre.factory.errors.NotFound('Product not specified');
            }

            if (req.method === 'POST') {
                // 確定
                await registerService.cancel({ transactionNumber: transaction.transactionNumber });
                message = '予約取引を中止しました';
                // セッション削除
                // tslint:disable-next-line:no-dynamic-delete
                delete (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`];
                req.flash('message', message);
                res.redirect(`/projects/${req.project.id}/assetTransactions/${chevre.factory.assetTransactionType.RegisterService}/start?product=${productId}`);

                return;
            }

            throw new Error('not implemented');
        } catch (error) {
            next(error);
        }
    }
);

export default registerServiceTransactionsRouter;
