/**
 * 決済カードルーター
 */
import { chevre } from '@cinerino/sdk';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

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
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            if (req.query.format === 'datatable') {
                const actionAttributes = await creatCheckMovieTicketActionAttributes({ req })({ product: productService });
                const checkAction = await payService.check(actionAttributes);

                const result = checkAction.result;
                if (result === undefined) {
                    throw new Error('checkAction.result undefined');
                }

                res.json({
                    success: true,
                    count: result.movieTickets.length,
                    results: result.movieTickets
                });
            } else {
                res.render('paymentMethods/movieTicket/check', {});
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

function creatCheckMovieTicketActionAttributes(params: {
    req: express.Request;
}) {
    return async (repos: {
        product: chevre.service.Product;
    }): Promise<chevre.factory.action.check.paymentMethod.movieTicket.IAttributes> => {
        const req = params.req;

        const paymentServiceId: string = req.query.paymentServiceId;
        const searchPaymentServicesResult = await repos.product.search({
            limit: 1,
            page: 1,
            id: { $eq: paymentServiceId }
        });
        const paymentService = searchPaymentServicesResult.data.shift();
        if (paymentService === undefined) {
            throw new Error('決済サービスが見つかりません');
        }
        const paymentMethodType = String(paymentService.serviceType?.codeValue);

        return {
            project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
            typeOf: chevre.factory.actionType.CheckAction,
            agent: {
                typeOf: chevre.factory.personType.Person,
                id: req.user.profile.sub,
                name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
            },
            object: [{
                typeOf: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
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
                            typeOf: <chevre.factory.eventType.ScreeningEvent>chevre.factory.eventType.ScreeningEvent,
                            id: req.query.serviceOutput?.reservationFor?.id
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
                    id: String(req.query.seller)
                }
            }]
        };
    };
}

export default movieTicketPaymentMethodRouter;
