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
// import * as createDebug from 'debug';
const express = require("express");
const http_status_1 = require("http-status");
// const debug = createDebug('cinerino-console:routes');
const movieTicketPaymentMethodRouter = express.Router();
/**
 * 決済カード認証
 */
movieTicketPaymentMethodRouter.get('/check', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const payService = new sdk_1.chevre.service.assetTransaction.Pay({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            seller: { id: req.query.seller },
            identifier: req.query.identifier,
            accessCode: req.query.accessCode,
            serviceOutput: {
                reservationFor: {
                    id: (_b = (_a = req.query.serviceOutput) === null || _a === void 0 ? void 0 : _a.reservationFor) === null || _b === void 0 ? void 0 : _b.id
                }
            }
        };
        if (req.query.format === 'datatable') {
            const paymentMethodType = req.query.paymentMethodType;
            const checkAction = yield payService.check({
                project: { id: req.project.id, typeOf: sdk_1.chevre.factory.organizationType.Project },
                typeOf: sdk_1.chevre.factory.actionType.CheckAction,
                agent: {
                    typeOf: sdk_1.chevre.factory.personType.Person,
                    id: req.user.profile.sub,
                    name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                },
                object: [{
                        typeOf: sdk_1.chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                        id: '',
                        paymentMethod: {
                            typeOf: paymentMethodType,
                            additionalProperty: [],
                            name: paymentMethodType,
                            paymentMethodId: '' // 使用されないので空でよし
                        },
                        movieTickets: [{
                                project: { typeOf: req.project.typeOf, id: req.project.id },
                                typeOf: paymentMethodType,
                                identifier: searchConditions.identifier,
                                accessCode: searchConditions.accessCode,
                                serviceType: '',
                                serviceOutput: {
                                    reservationFor: {
                                        typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
                                        id: searchConditions.serviceOutput.reservationFor.id
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
                            id: String(searchConditions.seller.id)
                        }
                    }]
            });
            const result = checkAction.result;
            if (result === undefined) {
                throw new Error('checkAction.result undefined');
            }
            // res.json({
            //     draw: req.body.draw,
            //     recordsTotal: result.movieTickets.length,
            //     recordsFiltered: result.movieTickets.length,
            //     data: result.movieTickets
            // });
            res.json({
                success: true,
                count: result.movieTickets.length,
                results: result.movieTickets
            });
        }
        else {
            res.render('paymentMethods/movieTicket/check', {
            // searchConditions: searchConditions,
            // sellers: sellers
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
exports.default = movieTicketPaymentMethodRouter;
