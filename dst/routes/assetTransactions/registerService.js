"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServiceTransactionsRouter = void 0;
/**
 * サービス登録取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
// import * as createDebug from 'debug';
const express = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
// const debug = createDebug('chevre-console:router');
const registerServiceTransactionsRouter = express.Router();
exports.registerServiceTransactionsRouter = registerServiceTransactionsRouter;
/**
 * 取引検索
 */
registerServiceTransactionsRouter.get('/', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const assetTransactionService = new sdk_1.chevre.service.AssetTransaction({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        if (req.query.format === 'datatable') {
            const searchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { startDate: sdk_1.chevre.factory.sortType.Descending },
                typeOf: sdk_1.chevre.factory.assetTransactionType.RegisterService,
                transactionNumber: {
                    $eq: (typeof req.query.transactionNumber === 'string' && req.query.transactionNumber.length > 0)
                        ? req.query.transactionNumber
                        : undefined
                },
                object: {
                    itemOffered: {
                        serviceOutput: {
                            identifier: (typeof ((_a = req.query.serviceOutput) === null || _a === void 0 ? void 0 : _a.identifier) === 'string'
                                && req.query.serviceOutput.identifier.length > 0)
                                ? { $eq: req.query.serviceOutput.identifier }
                                : undefined
                        }
                    }
                }
            };
            const searchResult = yield assetTransactionService.search(searchConditions);
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data.map((d) => {
                    return Object.assign(Object.assign({}, d), { numObjects: (Array.isArray(d.object))
                            ? d.object.length
                            : 0 });
                })
            });
        }
        else {
            res.render('assetTransactions/registerService/index', {
                moment: moment,
                query: req.query,
                ActionStatusType: sdk_1.chevre.factory.actionStatusType
            });
        }
    }
    catch (error) {
        if (req.query.format === 'datatable') {
            res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
        else {
            next(error);
        }
    }
}));
/**
 * サービス登録取引開始
 */
registerServiceTransactionsRouter.all('/start', 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d;
    try {
        let values = {};
        let message = '';
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const registerService = new sdk_1.chevre.service.assetTransaction.RegisterService({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const permitService = new sdk_1.chevre.service.Permit({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const transactionNumberService = new sdk_1.chevre.service.TransactionNumber({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const sellerService = new sdk_1.chevre.service.Seller({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const product = yield productService.findById({ id: req.query.product });
        const offers = yield productService.searchOffers({ id: String(product.id) });
        const selectedOffer = offers[0];
        if (selectedOffer === undefined) {
            throw new Error('selectedOffer undefined');
        }
        if (req.method === 'POST') {
            values = req.body;
            try {
                const serviceOutputName = (_b = req.body.serviceOutput) === null || _b === void 0 ? void 0 : _b.name;
                const numOutputs = (typeof req.body.numOutputs === 'string' && req.body.numOutputs.length > 0)
                    ? Number(req.body.numOutputs)
                    : 1;
                const seller = yield sellerService.findById({ id: (_d = (_c = req.body.serviceOutput) === null || _c === void 0 ? void 0 : _c.issuedBy) === null || _d === void 0 ? void 0 : _d.id });
                const issuedBy = {
                    // project: seller.project,
                    id: seller.id,
                    name: seller.name,
                    typeOf: seller.typeOf
                };
                let acceptedOffer;
                // tslint:disable-next-line:prefer-array-literal
                acceptedOffer = [...Array(Number(numOutputs))].map(() => {
                    return {
                        typeOf: sdk_1.chevre.factory.offerType.Offer,
                        id: selectedOffer.id,
                        itemOffered: {
                            id: product.id,
                            project: product.project,
                            serviceOutput: {
                                issuedBy: issuedBy,
                                name: (typeof serviceOutputName === 'string' && serviceOutputName.length > 0)
                                    ? serviceOutputName
                                    : undefined,
                                project: product.project,
                                typeOf: sdk_1.chevre.factory.permit.PermitType.Permit
                            },
                            typeOf: product.typeOf
                        }
                    };
                });
                const expires = moment()
                    .add(1, 'minutes')
                    .toDate();
                let object = acceptedOffer;
                object = yield createServiceOutputIdentifier({ acceptedOffer, product })({
                    permitService: permitService
                });
                const { transactionNumber } = yield transactionNumberService.publish({
                    project: { id: req.project.id }
                });
                const transaction = yield registerService.start({
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.assetTransactionType.RegisterService,
                    transactionNumber: transactionNumber,
                    expires: expires,
                    agent: {
                        typeOf: sdk_1.chevre.factory.personType.Person,
                        id: req.user.profile.sub,
                        name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                    },
                    object: object
                });
                // 確認画面へ情報を引き継ぐ
                // セッションに取引追加
                req.session[`transaction:${transaction.transactionNumber}`] = transaction;
                res.redirect(`/projects/${req.project.id}/assetTransactions/${transaction.typeOf}/${transaction.transactionNumber}/confirm`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        const searchSellersResult = yield sellerService.search({ project: { id: { $eq: req.project.id } } });
        res.render('assetTransactions/registerService/start', {
            values: values,
            message: message,
            moment: moment,
            product: product,
            sellers: searchSellersResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
function createServiceOutputIdentifier(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const publishParams = params.acceptedOffer.map(() => {
            return { project: { id: params.product.project.id } };
        });
        const publishIdentifierResult = yield repos.permitService.publishIdentifier(publishParams);
        // 識別子を発行
        return Promise.all(params.acceptedOffer.map((o, key) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            return Object.assign(Object.assign({}, o), { itemOffered: Object.assign(Object.assign({}, o.itemOffered), { serviceOutput: Object.assign(Object.assign({}, (_a = o.itemOffered) === null || _a === void 0 ? void 0 : _a.serviceOutput), { accessCode: createAccessCode(), project: params.product.project, typeOf: sdk_1.chevre.factory.permit.PermitType.Permit, identifier: publishIdentifierResult[key].identifier }) }) });
        })));
    });
}
function createAccessCode() {
    // tslint:disable-next-line:insecure-random no-magic-numbers
    return String(Math.floor((Math.random() * 9000) + 1000));
}
/**
 * 予約取引確認
 */
registerServiceTransactionsRouter.all('/:transactionNumber/confirm', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        let message = '';
        const transaction = req.session[`transaction:${req.params.transactionNumber}`];
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction in session');
        }
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const registerService = new sdk_1.chevre.service.assetTransaction.RegisterService({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productId = (_e = transaction.object[0].itemOffered) === null || _e === void 0 ? void 0 : _e.id;
        if (typeof productId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('Product not specified');
        }
        if (req.method === 'POST') {
            // 確定
            yield registerService.confirm({ transactionNumber: transaction.transactionNumber });
            message = 'サービス登録取引を確定しました';
            // セッション削除
            // tslint:disable-next-line:no-dynamic-delete
            delete req.session[`transaction:${transaction.transactionNumber}`];
            req.flash('message', message);
            res.redirect(`/projects/${req.project.id}/assetTransactions/${sdk_1.chevre.factory.assetTransactionType.RegisterService}/start?product=${productId}`);
            return;
        }
        else {
            const product = yield productService.findById({ id: productId });
            res.render('assetTransactions/registerService/confirm', {
                transaction: transaction,
                moment: moment,
                message: message,
                product: product
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引中止
 */
registerServiceTransactionsRouter.all('/:transactionNumber/cancel', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    try {
        let message = '';
        const transaction = req.session[`transaction:${req.params.transactionNumber}`];
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction in session');
        }
        const registerService = new sdk_1.chevre.service.assetTransaction.RegisterService({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productId = (_f = transaction.object[0].itemOffered) === null || _f === void 0 ? void 0 : _f.id;
        if (typeof productId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('Product not specified');
        }
        if (req.method === 'POST') {
            // 確定
            yield registerService.cancel({ transactionNumber: transaction.transactionNumber });
            message = '予約取引を中止しました';
            // セッション削除
            // tslint:disable-next-line:no-dynamic-delete
            delete req.session[`transaction:${transaction.transactionNumber}`];
            req.flash('message', message);
            res.redirect(`/projects/${req.project.id}/assetTransactions/${sdk_1.chevre.factory.assetTransactionType.RegisterService}/start?product=${productId}`);
            return;
        }
        throw new Error('not implemented');
    }
    catch (error) {
        next(error);
    }
}));
