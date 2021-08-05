/**
 * 決済カードルーター
 */
import { chevre } from '@cinerino/sdk';
// import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

// const debug = createDebug('cinerino-console:routes');
const movieTicketPaymentMethodRouter = express.Router();

/**
 * 決済カード認証
 */
movieTicketPaymentMethodRouter.get(
    '/check',
    async (req, res, next) => {
        try {
            const payService = new chevre.service.assetTransaction.Pay({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: any = {
                seller: { id: req.query.seller },
                identifier: req.query.identifier,
                accessCode: req.query.accessCode,
                serviceOutput: {
                    reservationFor: {
                        id: req.query.serviceOutput?.reservationFor?.id
                    }
                }
            };

            if (req.query.format === 'datatable') {
                const paymentMethodType: string = req.query.paymentMethodType;

                const checkAction = await payService.check({
                    project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
                    typeOf: chevre.factory.actionType.CheckAction,
                    agent: {
                        typeOf: chevre.factory.personType.Person,
                        id: req.user.profile.sub,
                        name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                    },
                    object: [{
                        typeOf: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
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
                                    typeOf: <chevre.factory.eventType.ScreeningEvent>chevre.factory.eventType.ScreeningEvent,
                                    id: searchConditions.serviceOutput.reservationFor.id
                                },
                                reservedTicket: {
                                    ticketedSeat: {
                                        typeOf: <chevre.factory.placeType.Seat>chevre.factory.placeType.Seat,
                                        seatNumber: '',
                                        seatRow: '',
                                        seatSection: ''
                                    }
                                }
                            }
                        }],
                        seller: {
                            typeOf: chevre.factory.organizationType.Corporation,
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
            } else {
                res.render('paymentMethods/movieTicket/check', {
                    // searchConditions: searchConditions,
                    // sellers: sellers
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

export default movieTicketPaymentMethodRouter;
