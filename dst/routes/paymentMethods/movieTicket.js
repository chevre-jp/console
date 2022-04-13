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
 * 決済カードルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express = require("express");
const http_status_1 = require("http-status");
const movieTicketPaymentMethodRouter = express.Router();
/**
 * 決済カード認証
 */
movieTicketPaymentMethodRouter.get('/check', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payService = new sdk_1.chevre.service.assetTransaction.Pay({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new sdk_1.chevre.service.Product({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        if (req.query.format === 'datatable') {
            const actionAttributes = yield creatCheckMovieTicketActionAttributes({ req })({ product: productService });
            const checkAction = yield payService.check(actionAttributes);
            const result = checkAction.result;
            if (result === undefined) {
                throw new Error('checkAction.result undefined');
            }
            res.json({
                success: true,
                count: result.movieTickets.length,
                results: result.movieTickets
            });
        }
        else {
            res.render('paymentMethods/movieTicket/check', {});
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
function creatCheckMovieTicketActionAttributes(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        const req = params.req;
        const paymentServiceId = req.query.paymentServiceId;
        const searchPaymentServicesResult = yield repos.product.search({
            limit: 1,
            page: 1,
            id: { $eq: paymentServiceId }
        });
        const paymentService = searchPaymentServicesResult.data.shift();
        if (paymentService === undefined) {
            throw new Error('決済サービスが見つかりません');
        }
        const paymentMethodType = String((_a = paymentService.serviceType) === null || _a === void 0 ? void 0 : _a.codeValue);
        return {
            project: { id: req.project.id, typeOf: sdk_1.chevre.factory.organizationType.Project },
            typeOf: sdk_1.chevre.factory.actionType.CheckAction,
            agent: {
                typeOf: sdk_1.chevre.factory.personType.Person,
                id: req.user.profile.sub,
                name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
            },
            object: [{
                    typeOf: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                    id: paymentServiceId,
                    paymentMethod: {
                        typeOf: paymentMethodType,
                        additionalProperty: [],
                        name: paymentMethodType,
                        paymentMethodId: '' // 使用されないので空でよし
                    },
                    movieTickets: [{
                            project: { typeOf: req.project.typeOf, id: req.project.id },
                            typeOf: paymentMethodType,
                            identifier: req.query.identifier,
                            accessCode: req.query.accessCode,
                            serviceType: '',
                            serviceOutput: {
                                reservationFor: {
                                    typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
                                    id: (_c = (_b = req.query.serviceOutput) === null || _b === void 0 ? void 0 : _b.reservationFor) === null || _c === void 0 ? void 0 : _c.id
                                },
                                reservedTicket: {
                                    ticketedSeat: {
                                        typeOf: sdk_1.chevre.factory.placeType.Seat,
                                        seatNumber: '',
                                        seatRow: '',
                                        seatSection: ''
                                    }
                                }
                            }
                        }],
                    seller: {
                        typeOf: sdk_1.chevre.factory.organizationType.Corporation,
                        id: String(req.query.seller)
                    }
                }]
        };
    });
}
exports.default = movieTicketPaymentMethodRouter;
