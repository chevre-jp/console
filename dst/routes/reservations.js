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
 * 予約ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const util_1 = require("util");
const reservationStatusType_1 = require("../factory/reservationStatusType");
const reservationsRouter = express_1.Router();
reservationsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('reservations/index', {
        message: '',
        reservationStatusTypes: reservationStatusType_1.reservationStatusTypes
    });
}));
reservationsRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    try {
        const reservationService = new sdk_1.chevre.service.Reservation({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchApplicationsResult = yield iamService.searchMembers({
            member: { typeOf: { $eq: sdk_1.chevre.factory.creativeWorkType.WebApplication } }
        });
        const applications = searchApplicationsResult.data.map((d) => d.member);
        const underNameIdentifierIn = [];
        if (typeof req.query.application === 'string' && req.query.application.length > 0) {
            underNameIdentifierIn.push({ name: 'clientId', value: req.query.application });
        }
        let underNameIdEq;
        if (typeof ((_a = req.query.underName) === null || _a === void 0 ? void 0 : _a.id) === 'string' && ((_b = req.query.underName) === null || _b === void 0 ? void 0 : _b.id.length) > 0) {
            underNameIdEq = (_c = req.query.underName) === null || _c === void 0 ? void 0 : _c.id;
        }
        let brokerIdEq;
        if (typeof ((_d = req.query.admin) === null || _d === void 0 ? void 0 : _d.id) === 'string' && ((_e = req.query.admin) === null || _e === void 0 ? void 0 : _e.id.length) > 0) {
            brokerIdEq = (_f = req.query.admin) === null || _f === void 0 ? void 0 : _f.id;
        }
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            project: { id: { $eq: req.project.id } },
            typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
            additionalTicketText: (typeof req.query.additionalTicketText === 'string' && req.query.additionalTicketText.length > 0)
                ? req.query.additionalTicketText
                : undefined,
            programMembershipUsed: {
                identifier: {
                    $eq: (typeof ((_g = req.query.programMembershipUsed) === null || _g === void 0 ? void 0 : _g.identifier) === 'string'
                        && req.query.programMembershipUsed.identifier.length > 0)
                        ? req.query.programMembershipUsed.identifier
                        : undefined
                },
                issuedThrough: {
                    serviceType: {
                        codeValue: {
                            $eq: (typeof ((_k = (_j = (_h = req.query.programMembershipUsed) === null || _h === void 0 ? void 0 : _h.issuedThrough) === null || _j === void 0 ? void 0 : _j.serviceType) === null || _k === void 0 ? void 0 : _k.codeValue) === 'string'
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
                        ids: (typeof ((_o = (_m = (_l = req.query.reservationFor) === null || _l === void 0 ? void 0 : _l.superEvent) === null || _m === void 0 ? void 0 : _m.location) === null || _o === void 0 ? void 0 : _o.id) === 'string'
                            && ((_r = (_q = (_p = req.query.reservationFor) === null || _p === void 0 ? void 0 : _p.superEvent) === null || _q === void 0 ? void 0 : _q.location) === null || _r === void 0 ? void 0 : _r.id.length) > 0)
                            ? [(_u = (_t = (_s = req.query.reservationFor) === null || _s === void 0 ? void 0 : _s.superEvent) === null || _t === void 0 ? void 0 : _t.location) === null || _u === void 0 ? void 0 : _u.id]
                            : undefined
                    },
                    workPerformed: {
                        identifiers: (typeof ((_x = (_w = (_v = req.query.reservationFor) === null || _v === void 0 ? void 0 : _v.superEvent) === null || _w === void 0 ? void 0 : _w.workPerformed) === null || _x === void 0 ? void 0 : _x.identifier) === 'string'
                            && ((_0 = (_z = (_y = req.query.reservationFor) === null || _y === void 0 ? void 0 : _y.superEvent) === null || _z === void 0 ? void 0 : _z.workPerformed) === null || _0 === void 0 ? void 0 : _0.identifier.length) > 0)
                            ? [(_3 = (_2 = (_1 = req.query.reservationFor) === null || _1 === void 0 ? void 0 : _1.superEvent) === null || _2 === void 0 ? void 0 : _2.workPerformed) === null || _3 === void 0 ? void 0 : _3.identifier]
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
        const { data } = yield reservationService.search(searchConditions);
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
                var _a, _b, _c, _d;
                const priceSpecification = t.price;
                const unitPriceSpec = priceSpecification.priceComponent.find((c) => c.typeOf === sdk_1.chevre.factory.priceSpecificationType.UnitPriceSpecification);
                let clientId;
                if (Array.isArray((_a = t.underName) === null || _a === void 0 ? void 0 : _a.identifier)) {
                    clientId = (_c = (_b = t.underName) === null || _b === void 0 ? void 0 : _b.identifier.find((i) => i.name === 'clientId')) === null || _c === void 0 ? void 0 : _c.value;
                }
                const application = applications.find((a) => a.id === clientId);
                const reservationStatusType = reservationStatusType_1.reservationStatusTypes.find((r) => t.reservationStatus === r.codeValue);
                // const ticketTYpe = searchOfferCategoryTypesResult.data.find(
                //     (c) => t.reservedTicket !== undefined
                //         && t.reservedTicket !== null
                //         && t.reservedTicket.ticketType.category !== undefined
                //         && c.codeValue === t.reservedTicket.ticketType.category.id
                // );
                const ticketedSeat = (_d = t.reservedTicket) === null || _d === void 0 ? void 0 : _d.ticketedSeat;
                const ticketedSeatStr = (ticketedSeat !== undefined)
                    ? util_1.format('%s %s %s', (typeof ticketedSeat.seatingType === 'string')
                        ? ticketedSeat.seatingType
                        : (Array.isArray(ticketedSeat.seatingType))
                            ? ticketedSeat.seatingType.join(',')
                            : '', ticketedSeat.seatSection, ticketedSeat.seatNumber)
                    : 'なし';
                return Object.assign(Object.assign({}, t), { application: application, reservationStatusTypeName: reservationStatusType === null || reservationStatusType === void 0 ? void 0 : reservationStatusType.name, checkedInText: (t.checkedIn === true) ? 'done' : undefined, attendedText: (t.attended === true) ? 'done' : undefined, unitPriceSpec: unitPriceSpec, ticketedSeatStr: ticketedSeatStr });
            })
        });
    }
    catch (err) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            success: false,
            count: 0,
            results: [],
            error: { message: err.message }
        });
    }
}));
reservationsRouter.get('/searchAdmins', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = 10;
        const page = 1;
        const nameRegex = req.query.name;
        const { data } = yield iamService.searchMembers({
            limit: limit,
            member: {
                typeOf: { $eq: sdk_1.chevre.factory.personType.Person },
                name: { $regex: (typeof nameRegex === 'string' && nameRegex.length > 0) ? nameRegex : undefined }
            }
        });
        res.json({
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data
        });
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
reservationsRouter.post('/cancel', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const successIds = [];
    const errorIds = [];
    try {
        const ids = req.body.ids;
        if (!Array.isArray(ids)) {
            throw new Error('ids must be Array');
        }
        const cancelReservationService = new sdk_1.chevre.service.assetTransaction.CancelReservation({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const expires = moment()
            .add(1, 'minute')
            .toDate();
        for (const id of ids) {
            const transaction = yield cancelReservationService.start({
                typeOf: sdk_1.chevre.factory.assetTransactionType.CancelReservation,
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
            yield cancelReservationService.confirm({ id: transaction.id });
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message,
            successIds: successIds,
            errorIds: errorIds
        });
    }
}));
reservationsRouter.patch('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationService = new sdk_1.chevre.service.Reservation({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        yield reservationService.update({
            id: req.params.id,
            update: Object.assign({}, (typeof req.body.additionalTicketText === 'string')
                ? { additionalTicketText: req.body.additionalTicketText }
                : undefined)
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
reservationsRouter.get('/:id/actions/use', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationService = new sdk_1.chevre.service.Reservation({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchResult = yield reservationService.searchUseActions({
            object: { id: req.params.id }
        });
        res.json(searchResult.data);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
exports.default = reservationsRouter;
