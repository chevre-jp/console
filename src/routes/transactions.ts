/**
 * 取引ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as csvtojson from 'csvtojson';
import * as createDebug from 'debug';
import * as express from 'express';
import * as moment from 'moment';

import registerServiceTransactionsRouter from './transactions/registerService';

const debug = createDebug('chevre-console:router');
const transactionsRouter = express.Router();

transactionsRouter.use(`/${chevre.factory.transactionType.RegisterService}`, registerServiceTransactionsRouter);

/**
 * 取引検索
 */
transactionsRouter.get(
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
 * 予約取引開始
 */
transactionsRouter.all(
    '/reserve/start',
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            let values: any = {};
            let message = '';

            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const reserveService = new chevre.service.transaction.Reserve({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const transactionNumberService = new chevre.service.TransactionNumber({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const event = await eventService.findById<chevre.factory.eventType.ScreeningEvent>({ id: req.query.event });
            const searchSeatSectionsResult = await placeService.searchScreeningRoomSections({
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
            const offers = await eventService.searchTicketOffers({ id: event.id });
            const selectedOffer = offers[0];
            if (selectedOffer === undefined) {
                throw new Error('selectedOffer undefined');
            }

            const useSeats = event.offers?.itemOffered.serviceOutput?.reservedTicket?.ticketedSeat !== undefined;

            if (req.method === 'POST') {
                values = req.body;

                try {
                    let seatNumbers: string[] = (typeof req.body.seatNumbers === 'string') ? [req.body.seatNumbers] : req.body.seatNumbers;
                    const numSeats = req.body.numSeats;
                    const additionalTicketText: string | undefined
                        = (typeof req.body.additionalTicketText === 'string' && req.body.additionalTicketText.length > 0)
                            ? req.body.additionalTicketText
                            : undefined;
                    const seatSection = req.body.seatSection;

                    const seatNumbersCsv = req.body.seatNumbersCsv;
                    const seatBranchCodeRegex = /^[0-9a-zA-Z\-]+$/;
                    if (typeof seatNumbersCsv === 'string' && seatNumbersCsv.length > 0) {
                        seatNumbers = [];

                        // tslint:disable-next-line:await-promise
                        const seatNumbersFromCsv = await csvtojson()
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

                    let acceptedOffer: chevre.factory.event.screeningEvent.IAcceptedTicketOfferWithoutDetail[];

                    if (useSeats) {
                        if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
                            throw new Error('座席番号が指定されていません');
                        }

                        // tslint:disable-next-line:prefer-array-literal
                        acceptedOffer = seatNumbers.map((seatNumber) => {
                            return {
                                id: <string>selectedOffer.id,
                                itemOffered: {
                                    serviceOutput: {
                                        typeOf: chevre.factory.reservationType.EventReservation,
                                        additionalTicketText: additionalTicketText,
                                        reservedTicket: {
                                            typeOf: 'Ticket',
                                            ticketedSeat: {
                                                typeOf: chevre.factory.placeType.Seat,
                                                seatNumber: seatNumber,
                                                seatRow: '',
                                                seatSection: seatSection
                                            }
                                        }
                                    }
                                }
                            };
                        });
                    } else {
                        if (typeof numSeats !== 'string' || numSeats.length === 0) {
                            throw new Error('座席数が指定されていません');
                        }

                        // tslint:disable-next-line:prefer-array-literal
                        acceptedOffer = [...Array(Number(numSeats))].map(() => {
                            return {
                                id: <string>selectedOffer.id,
                                itemOffered: {
                                    serviceOutput: {
                                        typeOf: chevre.factory.reservationType.EventReservation,
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

                    const object: chevre.factory.transaction.reserve.IObjectWithoutDetail = {
                        acceptedOffer: acceptedOffer,
                        event: {
                            id: event.id
                        }
                        // onReservationStatusChanged?: IOnReservationStatusChanged;
                    };

                    debug('取引を開始します...', values, acceptedOffer);
                    const { transactionNumber } = await transactionNumberService.publish({
                        project: { id: req.project.id }
                    });

                    await reserveService.startWithNoResponse({
                        project: { typeOf: req.project.typeOf, id: req.project.id },
                        typeOf: chevre.factory.transactionType.Reserve,
                        transactionNumber: transactionNumber,
                        expires: expires,
                        agent: {
                            typeOf: 'Person',
                            id: req.user.profile.sub,
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
                    (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`] = transaction;

                    res.redirect(`/transactions/reserve/${transaction.transactionNumber}/confirm`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }

            res.render('transactions/reserve/start', {
                values: values,
                message: message,
                moment: moment,
                event: event,
                seatSections: searchSeatSectionsResult.data,
                useSeats
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約取引確認
 */
transactionsRouter.all(
    '/reserve/:transactionNumber/confirm',
    async (req, res, next) => {
        try {
            let message = '';

            const transaction = <chevre.factory.transaction.reserve.ITransaction>
                (<Express.Session>req.session)[`transaction:${req.params.transactionNumber}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const reserveService = new chevre.service.transaction.Reserve({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const eventId = transaction.object.event?.id;
            if (typeof eventId !== 'string') {
                throw new chevre.factory.errors.NotFound('Event not specified');
            }

            if (req.method === 'POST') {
                // 確定
                await reserveService.confirm({ transactionNumber: transaction.transactionNumber });
                message = '予約取引を確定しました';
                // セッション削除
                // tslint:disable-next-line:no-dynamic-delete
                delete (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`];
                req.flash('message', message);
                res.redirect(`/transactions/reserve/start?event=${eventId}`);

                return;
            } else {
                const event = await eventService.findById({ id: eventId });

                res.render('transactions/reserve/confirm', {
                    transaction: transaction,
                    moment: moment,
                    message: message,
                    event: event
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
transactionsRouter.all(
    '/reserve/:transactionNumber/cancel',
    async (req, res, next) => {
        try {
            let message = '';

            const transaction = <chevre.factory.transaction.reserve.ITransaction>
                (<Express.Session>req.session)[`transaction:${req.params.transactionNumber}`];
            if (transaction === undefined) {
                throw new chevre.factory.errors.NotFound('Transaction in session');
            }

            const reserveService = new chevre.service.transaction.Reserve({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const eventId = transaction.object.event?.id;
            if (typeof eventId !== 'string') {
                throw new chevre.factory.errors.NotFound('Event not specified');
            }

            if (req.method === 'POST') {
                // 確定
                await reserveService.cancel({ transactionNumber: transaction.transactionNumber });
                message = '予約取引を中止しました';
                // セッション削除
                // tslint:disable-next-line:no-dynamic-delete
                delete (<Express.Session>req.session)[`transaction:${transaction.transactionNumber}`];
                req.flash('message', message);
                res.redirect(`/transactions/reserve/start?event=${eventId}`);

                return;
            }

            throw new Error('not implemented');
        } catch (error) {
            next(error);
        }
    }
);

export default transactionsRouter;
