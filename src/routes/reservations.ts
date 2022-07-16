/**
 * 予約ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
import { INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import { format } from 'util';

import { reservationStatusTypes } from '../factory/reservationStatusType';
import * as TimelineFactory from '../factory/timeline';

type IEventReservationPriceSpec = chevre.factory.reservation.IPriceSpecification<chevre.factory.reservationType.EventReservation>;

const reservationsRouter = Router();

reservationsRouter.get(
    '',
    async (__, res) => {
        res.render('reservations/index', {
            message: '',
            reservationStatusTypes: reservationStatusTypes
        });
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(
    req: Request
): chevre.factory.reservation.ISearchConditions<chevre.factory.reservationType.EventReservation> {

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

    return {
        limit: req.query.limit,
        page: req.query.page,
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.reservationType.EventReservation,
        additionalTicketText: (typeof req.query.additionalTicketText === 'string' && req.query.additionalTicketText.length > 0)
            ? req.query.additionalTicketText
            : undefined,
        price: {
            priceComponent: {
                appliesToMovieTicket: {
                    identifier: {
                        $eq: (typeof req.query.appliesToMovieTicket?.identifier === 'string'
                            && req.query.appliesToMovieTicket.identifier.length > 0)
                            ? req.query.appliesToMovieTicket.identifier
                            : undefined
                    }
                }
            }
        },
        programMembershipUsed: {
            identifier: {
                $eq: (typeof req.query.programMembershipUsed?.identifier === 'string'
                    && req.query.programMembershipUsed.identifier.length > 0)
                    ? req.query.programMembershipUsed.identifier
                    : undefined
            },
            issuedThrough: {
                serviceType: {
                    codeValue: {
                        $eq: (typeof req.query.programMembershipUsed?.issuedThrough?.serviceType?.codeValue === 'string'
                            && req.query.programMembershipUsed.issuedThrough.serviceType.codeValue.length > 0)
                            ? req.query.programMembershipUsed.issuedThrough.serviceType.codeValue
                            : undefined
                    }
                }
            }
        },
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
                    .tz('Asia/Tokyo')
                    .endOf('day')
                    // .add(1, 'day')
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
}

type IUnitPriceSpec = chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.UnitPriceSpecification>;
interface IApplication {
    typeOf: chevre.factory.iam.IMemberType;
    id: string;
    name?: string;
    username?: string;
    hasRole: chevre.factory.iam.IRole[];
}
reservationsRouter.get(
    '/search',
    async (req, res) => {
        try {
            const reservationService = new chevre.service.Reservation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let applications: IApplication[] | undefined;
            try {
                const searchApplicationsResult = await iamService.searchMembers({
                    member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
                });
                applications = searchApplicationsResult.data.map((d) => d.member);
            } catch (error) {
                // no op
                // 権限がない場合、検索できない
            }

            const searchConditions = createSearchConditions(req);
            const { data } = await reservationService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((t) => {
                    const priceSpecification = <IEventReservationPriceSpec>t.price;
                    const unitPriceSpec = <IUnitPriceSpec | undefined>priceSpecification.priceComponent.find(
                        (c) => c.typeOf === chevre.factory.priceSpecificationType.UnitPriceSpecification
                    );

                    let clientId: string | undefined;
                    if (Array.isArray(t.underName?.identifier)) {
                        clientId = t.underName?.identifier.find((i) => i.name === 'clientId')?.value;
                    }
                    let application: IApplication | undefined;
                    if (Array.isArray(applications)) {
                        application = applications.find((a) => a.id === clientId);
                    }

                    const reservationStatusType = reservationStatusTypes.find((r) => t.reservationStatus === r.codeValue);

                    const ticketedSeat = t.reservedTicket?.ticketedSeat;
                    const ticketedSeatStr: string = (typeof ticketedSeat?.typeOf === 'string')
                        ? format(
                            '%s %s',
                            (typeof ticketedSeat.seatingType === 'string')
                                ? ticketedSeat.seatingType
                                : (Array.isArray(ticketedSeat.seatingType))
                                    ? ticketedSeat.seatingType.join(',')
                                    : '',
                            ticketedSeat.seatNumber
                        )
                        : '';

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
            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
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
            const transactionNumberService = new chevre.service.TransactionNumber({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const expires = moment()
                .add(1, 'minute')
                .toDate();
            for (const id of ids) {
                const { transactionNumber } = await transactionNumberService.publish({
                    project: { id: req.project.id }
                });
                await cancelReservationService.startAndConfirm({
                    typeOf: chevre.factory.assetTransactionType.CancelReservation,
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    transactionNumber,
                    agent: {
                        typeOf: chevre.factory.personType.Person,
                        id: req.user.profile.sub,
                        name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                    },
                    expires: expires,
                    object: {
                        reservation: { id: id }
                    }
                });
                // await cancelReservationService.confirm({ id: transaction.id });
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

reservationsRouter.get(
    '/:id/actions/use',
    async (req, res) => {
        try {
            const reservationService = new chevre.service.Reservation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchResult = await reservationService.searchUseActions({
                object: { id: req.params.id }
            });

            res.json(searchResult.data.map((a) => {
                return {
                    ...a,
                    timeline: TimelineFactory.createFromAction({
                        project: { id: req.project.id },
                        action: a
                    })
                };
            }));
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

export default reservationsRouter;
