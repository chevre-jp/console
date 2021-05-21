/**
 * 予約ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as cinerino from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import { format } from 'util';

import { reservationStatusTypes } from '../factory/reservationStatusType';

type IEventReservationPriceSpec = chevre.factory.reservation.IPriceSpecification<chevre.factory.reservationType.EventReservation>;

const reservationsRouter = Router();

reservationsRouter.get(
    '',
    async (req, res) => {
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        const searchOfferCategoryTypesResult = await categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
        });

        const searchMovieTheatersResult = await placeService.searchMovieTheaters({
            limit: 100,
            project: { ids: [req.project.id] }
        });

        res.render('reservations/index', {
            message: '',
            reservationStatusType: chevre.factory.reservationStatusType,
            reservationStatusTypes: reservationStatusTypes,
            ticketTypeCategories: searchOfferCategoryTypesResult.data,
            movieTheaters: searchMovieTheatersResult.data
        });
    }
);

reservationsRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        try {
            const reservationService = new chevre.service.Reservation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const iamService = new cinerino.service.IAM({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchApplicationsResult = await iamService.searchMembers({
                member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
            });
            const applications = searchApplicationsResult.data.map((d) => d.member);

            const underNameIdentifierIn: chevre.factory.propertyValue.IPropertyValue<string>[] = [];
            if (typeof req.query.application === 'string' && req.query.application.length > 0) {
                underNameIdentifierIn.push({ name: 'clientId', value: req.query.application });
            }

            let underNameIdEq: string | undefined;
            if (typeof req.query.underName?.id === 'string' && req.query.underName?.id.length > 0) {
                underNameIdEq = req.query.underName?.id;
            }

            let brokerIdEq: string | undefined;
            if (typeof req.query.admin?.id === 'string' && req.query.admin?.id.length > 0) {
                brokerIdEq = req.query.admin?.id;
            }

            const searchConditions: chevre.factory.reservation.ISearchConditions<chevre.factory.reservationType.EventReservation> = {
                limit: req.query.limit,
                page: req.query.page,
                project: { ids: [req.project.id] },
                typeOf: chevre.factory.reservationType.EventReservation,
                additionalTicketText: (typeof req.query.additionalTicketText === 'string' && req.query.additionalTicketText.length > 0)
                    ? req.query.additionalTicketText
                    : undefined,
                reservationNumbers: (req.query.reservationNumber !== undefined
                    && req.query.reservationNumber !== '')
                    ? [String(req.query.reservationNumber)]
                    : undefined,
                reservationStatuses: (req.query.reservationStatus !== undefined && req.query.reservationStatus !== '')
                    ? [req.query.reservationStatus]
                    : undefined,
                reservationFor: {
                    ids: (req.query.reservationFor !== undefined
                        && req.query.reservationFor.id !== undefined
                        && req.query.reservationFor.id !== '')
                        ? [String(req.query.reservationFor.id)]
                        : undefined,
                    superEvent: {
                        ids: (req.query.reservationFor !== undefined
                            && req.query.reservationFor.superEvent !== undefined
                            && req.query.reservationFor.superEvent.id !== undefined
                            && req.query.reservationFor.superEvent.id !== '')
                            ? [String(req.query.reservationFor.superEvent.id)]
                            : undefined,
                        location: {
                            ids: (typeof req.query.reservationFor?.superEvent?.location?.id === 'string'
                                && req.query.reservationFor?.superEvent?.location?.id.length > 0)
                                ? [req.query.reservationFor?.superEvent?.location?.id]
                                : undefined
                        },
                        workPerformed: {
                            identifiers: (typeof req.query.reservationFor?.superEvent?.workPerformed?.identifier === 'string'
                                && req.query.reservationFor?.superEvent?.workPerformed?.identifier.length > 0)
                                ? [req.query.reservationFor?.superEvent?.workPerformed?.identifier]
                                : undefined
                        }
                    },
                    startFrom: (req.query.reservationFor !== undefined
                        && req.query.reservationFor.startFrom !== undefined
                        && req.query.reservationFor.startFrom !== '')
                        ? moment(`${String(req.query.reservationFor.startFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .toDate()
                        : undefined,
                    startThrough: (req.query.reservationFor !== undefined
                        && req.query.reservationFor.startThrough !== undefined
                        && req.query.reservationFor.startThrough !== '')
                        ? moment(`${String(req.query.reservationFor.startThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .add(1, 'day')
                            .toDate()
                        : undefined
                },
                modifiedFrom: (req.query.modifiedFrom !== '')
                    ? moment(`${String(req.query.modifiedFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                modifiedThrough: (req.query.modifiedThrough !== '')
                    ? moment(`${String(req.query.modifiedThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                    : undefined,
                bookingFrom: (req.query.bookingFrom !== '')
                    ? moment(`${String(req.query.bookingFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                bookingThrough: (req.query.bookingThrough !== '')
                    ? moment(`${String(req.query.bookingThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                    : undefined,
                reservedTicket: {
                    ticketType: {
                        ids: (req.query.reservedTicket !== undefined
                            && req.query.reservedTicket.ticketType !== undefined
                            && req.query.reservedTicket.ticketType.id !== undefined
                            && req.query.reservedTicket.ticketType.id !== '')
                            ? [req.query.reservedTicket.ticketType.id]
                            : undefined,
                        category: {
                            ids: (req.query.reservedTicket !== undefined
                                && req.query.reservedTicket.ticketType !== undefined
                                && req.query.reservedTicket.ticketType.category !== undefined
                                && req.query.reservedTicket.ticketType.category.id !== undefined
                                && req.query.reservedTicket.ticketType.category.id !== '')
                                ? [req.query.reservedTicket.ticketType.category.id]
                                : undefined
                        }
                    },
                    ticketedSeat: {
                        seatNumbers: (req.query.reservedTicket !== undefined
                            && req.query.reservedTicket.ticketedSeat !== undefined
                            && req.query.reservedTicket.ticketedSeat.seatNumber !== undefined
                            && req.query.reservedTicket.ticketedSeat.seatNumber !== '')
                            ? [req.query.reservedTicket.ticketedSeat.seatNumber]
                            : undefined
                    }
                },
                underName: {
                    id: (typeof underNameIdEq === 'string')
                        ? underNameIdEq
                        : undefined,
                    name: (req.query.underName !== undefined
                        && req.query.underName.name !== undefined
                        && req.query.underName.name !== '')
                        ? req.query.underName.name
                        : undefined,
                    email: (req.query.underName !== undefined
                        && req.query.underName.email !== undefined
                        && req.query.underName.email !== '')
                        ? req.query.underName.email
                        : undefined,
                    telephone: (req.query.underName !== undefined
                        && req.query.underName.telephone !== undefined
                        && req.query.underName.telephone !== '')
                        ? req.query.underName.telephone
                        : undefined,
                    identifier: {
                        $in: (underNameIdentifierIn.length > 0) ? underNameIdentifierIn : undefined
                    }
                },
                attended: (req.query.attended === '1') ? true : undefined,
                checkedIn: (req.query.checkedIn === '1') ? true : undefined,
                broker: {
                    id: (typeof brokerIdEq === 'string')
                        ? brokerIdEq
                        : undefined
                }
            };
            const { data } = await reservationService.search(searchConditions);

            // const offerService = new chevre.service.Offer({
            //     endpoint: <string>process.env.API_ENDPOINT,
            //     auth: req.user.authClient
            // });
            // const searchCategoriesResult = await offerService.searchCategories({ project: { ids: [req.project.id] } });

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((t) => {
                    const priceSpecification = <IEventReservationPriceSpec>t.price;
                    const unitPriceSpec = priceSpecification.priceComponent.find(
                        (c) => c.typeOf === chevre.factory.priceSpecificationType.UnitPriceSpecification
                    );

                    let clientId: string | undefined;
                    if (Array.isArray(t.underName?.identifier)) {
                        clientId = t.underName?.identifier.find((i) => i.name === 'clientId')?.value;
                    }
                    const application = applications.find((a) => a.id === clientId);

                    const reservationStatusType = reservationStatusTypes.find((r) => t.reservationStatus === r.codeValue);
                    // const ticketTYpe = searchOfferCategoryTypesResult.data.find(
                    //     (c) => t.reservedTicket !== undefined
                    //         && t.reservedTicket !== null
                    //         && t.reservedTicket.ticketType.category !== undefined
                    //         && c.codeValue === t.reservedTicket.ticketType.category.id
                    // );

                    const ticketedSeat = t.reservedTicket?.ticketedSeat;
                    const ticketedSeatStr: string = (ticketedSeat !== undefined)
                        ? format(
                            '%s %s %s',
                            (ticketedSeat.seatingType !== undefined && ticketedSeat.seatingType !== null)
                                ? (typeof ticketedSeat.seatingType === 'string')
                                    ? ticketedSeat.seatingType
                                    : (Array.isArray(ticketedSeat.seatingType))
                                        ? ticketedSeat.seatingType.join(',')
                                        : (<any>ticketedSeat.seatingType).typeOf // 旧データへの互換性対応
                                : '',
                            ticketedSeat.seatSection,
                            ticketedSeat.seatNumber
                        )
                        : 'なし';

                    return {
                        ...t,
                        application: application,
                        reservationStatusTypeName: reservationStatusType?.name,
                        checkedInText: (t.checkedIn === true) ? 'done' : undefined,
                        attendedText: (t.attended === true) ? 'done' : undefined,
                        unitPriceSpec: unitPriceSpec,
                        ticketedSeatStr: ticketedSeatStr
                    };
                })
            });
        } catch (err) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    count: 0,
                    results: [],
                    error: { message: err.message }
                });
        }
    }
);

reservationsRouter.get(
    '/searchAdmins',
    async (req, res) => {
        try {
            const iamService = new cinerino.service.IAM({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = 10;
            const page = 1;
            const nameRegex = req.query.name;

            const { data } = await iamService.searchMembers({
                limit: limit,
                member: {
                    typeOf: { $eq: chevre.factory.personType.Person },
                    name: { $regex: (typeof nameRegex === 'string' && nameRegex.length > 0) ? nameRegex : undefined }
                }
            });

            res.json({
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data
            });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

reservationsRouter.post(
    '/cancel',
    async (req, res) => {
        const successIds: string[] = [];
        const errorIds: string[] = [];

        try {
            const ids = req.body.ids;
            if (!Array.isArray(ids)) {
                throw new Error('ids must be Array');
            }

            const cancelReservationService = new chevre.service.assetTransaction.CancelReservation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const expires = moment()
                .add(1, 'minute')
                .toDate();
            for (const id of ids) {
                const transaction = await cancelReservationService.start({
                    typeOf: chevre.factory.assetTransactionType.CancelReservation,
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    agent: {
                        typeOf: 'Person',
                        id: req.user.profile.sub,
                        name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                    },
                    expires: expires,
                    object: {
                        reservation: { id: id }
                    }
                });
                await cancelReservationService.confirm({ id: transaction.id });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message,
                    successIds: successIds,
                    errorIds: errorIds
                });
        }
    }
);

reservationsRouter.patch(
    '/:id',
    async (req, res) => {
        try {
            const reservationService = new chevre.service.Reservation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            await reservationService.update({
                id: req.params.id,
                update: {
                    ...(typeof req.body.additionalTicketText === 'string')
                        ? { additionalTicketText: req.body.additionalTicketText }
                        : undefined
                }
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

export default reservationsRouter;
