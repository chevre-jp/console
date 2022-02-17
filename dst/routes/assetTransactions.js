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
/**
 * 取引ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const csvtojson = require("csvtojson");
const createDebug = require("debug");
const express = require("express");
const moment = require("moment");
const cancelReservation_1 = require("./assetTransactions/cancelReservation");
const moneyTransfer_1 = require("./assetTransactions/moneyTransfer");
const pay_1 = require("./assetTransactions/pay");
const refund_1 = require("./assetTransactions/refund");
const registerService_1 = require("./assetTransactions/registerService");
const reserve_1 = require("./assetTransactions/reserve");
const debug = createDebug('chevre-console:router');
const assetTransactionsRouter = express.Router();
assetTransactionsRouter.use(`/${sdk_1.chevre.factory.assetTransactionType.CancelReservation}`, cancelReservation_1.default);
assetTransactionsRouter.use(`/${sdk_1.chevre.factory.assetTransactionType.MoneyTransfer}`, moneyTransfer_1.default);
assetTransactionsRouter.use(`/${sdk_1.chevre.factory.assetTransactionType.Pay}`, pay_1.default);
assetTransactionsRouter.use(`/${sdk_1.chevre.factory.assetTransactionType.Refund}`, refund_1.default);
assetTransactionsRouter.use(`/${sdk_1.chevre.factory.assetTransactionType.RegisterService}`, registerService_1.default);
assetTransactionsRouter.use(`/${sdk_1.chevre.factory.assetTransactionType.Reserve}`, reserve_1.default);
/**
 * 予約取引開始
 */
assetTransactionsRouter.all('/reserve/start', 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        let values = {};
        let message = '';
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const placeService = new sdk_1.chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const reserveService = new sdk_1.chevre.service.assetTransaction.Reserve({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const transactionNumberService = new sdk_1.chevre.service.TransactionNumber({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const event = yield eventService.findById({ id: req.query.event });
        const searchSeatSectionsResult = yield placeService.searchScreeningRoomSections({
            limit: 100,
            page: 1,
            project: { id: { $eq: req.project.id } },
            containedInPlace: {
                branchCode: {
                    $eq: event.location.branchCode
                },
                containedInPlace: {
                    branchCode: {
                        $eq: event.superEvent.location.branchCode
                    }
                }
            }
        });
        const offers = yield eventService.searchTicketOffers({ id: event.id });
        const selectedOffer = offers[0];
        if (selectedOffer === undefined) {
            throw new Error('selectedOffer undefined');
        }
        const useSeats = ((_c = (_b = (_a = event.offers) === null || _a === void 0 ? void 0 : _a.itemOffered.serviceOutput) === null || _b === void 0 ? void 0 : _b.reservedTicket) === null || _c === void 0 ? void 0 : _c.ticketedSeat) !== undefined;
        if (req.method === 'POST') {
            values = req.body;
            try {
                let seatNumbers = (typeof req.body.seatNumbers === 'string') ? [req.body.seatNumbers] : req.body.seatNumbers;
                const numSeats = req.body.numSeats;
                const additionalTicketText = (typeof req.body.additionalTicketText === 'string' && req.body.additionalTicketText.length > 0)
                    ? req.body.additionalTicketText
                    : undefined;
                const seatSection = req.body.seatSection;
                const seatNumbersCsv = req.body.seatNumbersCsv;
                const seatBranchCodeRegex = /^[0-9a-zA-Z\-]+$/;
                if (typeof seatNumbersCsv === 'string' && seatNumbersCsv.length > 0) {
                    seatNumbers = [];
                    // tslint:disable-next-line:await-promise
                    const seatNumbersFromCsv = yield csvtojson()
                        .fromString(seatNumbersCsv);
                    if (Array.isArray(seatNumbersFromCsv)) {
                        seatNumbers = seatNumbersFromCsv.filter((p) => {
                            return typeof p.branchCode === 'string'
                                && p.branchCode.length > 0
                                && seatBranchCodeRegex.test(p.branchCode);
                        })
                            .map((p) => p.branchCode);
                    }
                }
                let acceptedOffer;
                if (useSeats) {
                    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
                        throw new Error('座席番号が指定されていません');
                    }
                    // tslint:disable-next-line:prefer-array-literal
                    acceptedOffer = seatNumbers.map((seatNumber) => {
                        return {
                            id: selectedOffer.id,
                            itemOffered: {
                                serviceOutput: {
                                    typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
                                    additionalTicketText: additionalTicketText,
                                    reservedTicket: {
                                        typeOf: 'Ticket',
                                        ticketedSeat: {
                                            typeOf: sdk_1.chevre.factory.placeType.Seat,
                                            seatNumber: seatNumber,
                                            seatRow: '',
                                            seatSection: seatSection
                                        }
                                    }
                                }
                            }
                        };
                    });
                }
                else {
                    if (typeof numSeats !== 'string' || numSeats.length === 0) {
                        throw new Error('座席数が指定されていません');
                    }
                    // tslint:disable-next-line:prefer-array-literal
                    acceptedOffer = [...Array(Number(numSeats))].map(() => {
                        return {
                            id: selectedOffer.id,
                            itemOffered: {
                                serviceOutput: {
                                    typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
                                    additionalTicketText: additionalTicketText,
                                    reservedTicket: {
                                        typeOf: 'Ticket'
                                    }
                                }
                            }
                        };
                    });
                }
                const expires = moment()
                    .add(1, 'minutes')
                    .toDate();
                const object = {
                    acceptedOffer: acceptedOffer,
                    reservationFor: { id: event.id },
                    broker: {
                        typeOf: sdk_1.chevre.factory.personType.Person,
                        id: req.user.profile.sub,
                        name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                    }
                    // onReservationStatusChanged?: IOnReservationStatusChanged;
                };
                debug('取引を開始します...', values, acceptedOffer);
                const { transactionNumber } = yield transactionNumberService.publish({
                    project: { id: req.project.id }
                });
                yield reserveService.startWithNoResponse({
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: sdk_1.chevre.factory.assetTransactionType.Reserve,
                    transactionNumber: transactionNumber,
                    expires: expires,
                    agent: {
                        typeOf: sdk_1.chevre.factory.creativeWorkType.WebApplication,
                        id: req.user.authClient.options.clientId,
                        name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                    },
                    object: object
                });
                debug('取引が開始されました', transactionNumber);
                // 確認画面へ情報を引き継ぐために
                const transaction = {
                    transactionNumber: transactionNumber,
                    object: object
                };
                // セッションに取引追加
                req.session[`transaction:${transaction.transactionNumber}`] = transaction;
                res.redirect(`/projects/${req.project.id}/assetTransactions/reserve/${transaction.transactionNumber}/confirm`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        res.render('assetTransactions/reserve/start', {
            values: values,
            message: message,
            moment: moment,
            event: event,
            seatSections: searchSeatSectionsResult.data,
            useSeats
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約取引確認
 */
assetTransactionsRouter.all('/reserve/:transactionNumber/confirm', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        let message = '';
        const transaction = req.session[`transaction:${req.params.transactionNumber}`];
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction in session');
        }
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const reserveService = new sdk_1.chevre.service.assetTransaction.Reserve({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const eventId = (_d = transaction.object.reservationFor) === null || _d === void 0 ? void 0 : _d.id;
        if (typeof eventId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('Event not specified');
        }
        if (req.method === 'POST') {
            // 確定
            yield reserveService.confirm({ transactionNumber: transaction.transactionNumber });
            message = '予約取引を確定しました';
            // セッション削除
            // tslint:disable-next-line:no-dynamic-delete
            delete req.session[`transaction:${transaction.transactionNumber}`];
            req.flash('message', message);
            res.redirect(`/projects/${req.project.id}/assetTransactions/reserve/start?event=${eventId}`);
            return;
        }
        else {
            const event = yield eventService.findById({ id: eventId });
            res.render('assetTransactions/reserve/confirm', {
                transaction: transaction,
                moment: moment,
                message: message,
                event: event
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
assetTransactionsRouter.all('/reserve/:transactionNumber/cancel', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        let message = '';
        const transaction = req.session[`transaction:${req.params.transactionNumber}`];
        if (transaction === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('Transaction in session');
        }
        const reserveService = new sdk_1.chevre.service.assetTransaction.Reserve({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const eventId = (_e = transaction.object.reservationFor) === null || _e === void 0 ? void 0 : _e.id;
        if (typeof eventId !== 'string') {
            throw new sdk_1.chevre.factory.errors.NotFound('Event not specified');
        }
        if (req.method === 'POST') {
            // 確定
            yield reserveService.cancel({ transactionNumber: transaction.transactionNumber });
            message = '予約取引を中止しました';
            // セッション削除
            // tslint:disable-next-line:no-dynamic-delete
            delete req.session[`transaction:${transaction.transactionNumber}`];
            req.flash('message', message);
            res.redirect(`/projects/${req.project.id}/assetTransactions/reserve/start?event=${eventId}`);
            return;
        }
        throw new Error('not implemented');
    }
    catch (error) {
        next(error);
    }
}));
exports.default = assetTransactionsRouter;
