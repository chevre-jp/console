/**
 * サービス登録取引ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
// import * as csvtojson from 'csvtojson';
// import * as createDebug from 'debug';
import * as express from 'express';
import * as moment from 'moment';

// const debug = createDebug('chevre-console:router');
const registerServiceTransactionsRouter = express.Router();

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
                auth: req.user.authClient
            });
            const registerService = new chevre.service.transaction.RegisterService({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const serviceOutputIdentifierService = new chevre.service.ServiceOutputIdentifier({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const transactionNumberService = new chevre.service.TransactionNumber({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
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
                        project: seller.project,
                        id: seller.id,
                        name: seller.name,
                        typeOf: seller.typeOf
                    };

                    let acceptedOffer: chevre.factory.transaction.registerService.IAcceptedOffer[];

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
                                    typeOf: <string>product.serviceOutput?.typeOf
                                },
                                typeOf: product.typeOf
                            }
                        };
                    });

                    const expires = moment()
                        .add(1, 'minutes')
                        .toDate();

                    let object: chevre.factory.transaction.registerService.IObjectWithoutDetail = acceptedOffer;
                    object = await createServiceOutputIdentifier({ acceptedOffer, product })({
                        serviceOutputIdentifierService: serviceOutputIdentifierService
                    });

                    const { transactionNumber } = await transactionNumberService.publish({
                        project: { id: req.project.id }
                    });

                    const transaction = await registerService.start({
                        project: { typeOf: req.project.typeOf, id: req.project.id },
                        typeOf: chevre.factory.transactionType.RegisterService,
                        transactionNumber: transactionNumber,
                        expires: expires,
                        agent: {
                            typeOf: 'Person',
                            id: req.user.profile.sub,
                            name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                        },
                        object: object
                    });
                    console.log(transaction);

                    // 確認画面へ情報を引き継ぐために
                    // const transaction = {
                    //     transactionNumber: transactionNumber,
                    //     object: object
                    // };

                    // セッションに取引追加
                    (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`] = transaction;

                    res.redirect(`/transactions/${transaction.typeOf}/${transaction.transactionNumber}/confirm`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }

            const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

            res.render('transactions/registerService/start', {
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
    acceptedOffer: chevre.factory.transaction.registerService.IObjectWithoutDetail;
    product: chevre.factory.product.IProduct;
}) {
    return async (repos: {
        serviceOutputIdentifierService: chevre.service.ServiceOutputIdentifier;
    }): Promise<chevre.factory.transaction.registerService.IObjectWithoutDetail> => {
        // 識別子を発行
        return Promise.all(params.acceptedOffer.map(async (o) => {
            const { identifier } = await repos.serviceOutputIdentifierService.publish({
                project: { id: params.product.project.id }
            });

            return {
                ...o,
                itemOffered: {
                    ...o.itemOffered,
                    serviceOutput: {
                        ...o.itemOffered?.serviceOutput,
                        // tslint:disable-next-line:no-suspicious-comment
                        accessCode: '1234', // TODO 自動生成する
                        project: params.product.project,
                        typeOf: String(params.product.serviceOutput?.typeOf),
                        identifier: identifier
                    }
                }
            };
        }));
    };
}

/**
 * 予約取引確認
 */
registerServiceTransactionsRouter.all(
    '/:transactionNumber/confirm',
    async (req, res, next) => {
        try {
            let message = '';

            const transaction = <chevre.factory.transaction.registerService.ITransaction>
                (<Express.Session>req.session)[`transaction:${req.params.transactionNumber}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const registerService = new chevre.service.transaction.RegisterService({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
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
                res.redirect(`/transactions/${chevre.factory.transactionType.RegisterService}/start?product=${productId}`);

                return;
            } else {
                const product = await productService.findById({ id: productId });

                res.render('transactions/registerService/confirm', {
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

            const transaction = <chevre.factory.transaction.registerService.ITransaction>
                (<Express.Session>req.session)[`transaction:${req.params.transactionNumber}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            const registerService = new chevre.service.transaction.RegisterService({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
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
                res.redirect(`/transactions/${chevre.factory.transactionType.RegisterService}/start?product=${productId}`);

                return;
            }

            throw new Error('not implemented');
        } catch (error) {
            next(error);
        }
    }
);

export default registerServiceTransactionsRouter;
