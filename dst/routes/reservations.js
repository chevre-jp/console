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
const TimelineFactory = require("../factory/timeline");
const reservationsRouter = express_1.Router();
reservationsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('reservations/index', {
        message: '',
        reservationStatusTypes: reservationStatusType_1.reservationStatusTypes
    });
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
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
    return {
        limit: req.query.limit,
        page: req.query.page,
        project: { id: { $eq: req.project.id } },
        typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
        additionalTicketText: (typeof req.query.additionalTicketText === 'string' && req.query.additionalTicketText.length > 0)
            ? req.query.additionalTicketText
            : undefined,
        price: {
            priceComponent: {
                appliesToMovieTicket: {
                    identifier: {
                        $eq: (typeof ((_g = req.query.appliesToMovieTicket) === null || _g === void 0 ? void 0 : _g.identifier) === 'string'
                            && req.query.appliesToMovieTicket.identifier.length > 0)
                            ? req.query.appliesToMovieTicket.identifier
                            : undefined
                    }
                }
            }
        },
        programMembershipUsed: {
            identifier: {
                $eq: (typeof ((_h = req.query.programMembershipUsed) === null || _h === void 0 ? void 0 : _h.identifier) === 'string'
                    && req.query.programMembershipUsed.identifier.length > 0)
                    ? req.query.programMembershipUsed.identifier
                    : undefined
            },
            issuedThrough: {
                serviceType: {
                    codeValue: {
                        $eq: (typeof ((_l = (_k = (_j = req.query.programMembershipUsed) === null || _j === void 0 ? void 0 : _j.issuedThrough) === null || _k === void 0 ? void 0 : _k.serviceType) === null || _l === void 0 ? void 0 : _l.codeValue) === 'string'
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
                    ids: (typeof ((_p = (_o = (_m = req.query.reservationFor) === null || _m === void 0 ? void 0 : _m.superEvent) === null || _o === void 0 ? void 0 : _o.location) === null || _p === void 0 ? void 0 : _p.id) === 'string'
                        && ((_s = (_r = (_q = req.query.reservationFor) === null || _q === void 0 ? void 0 : _q.superEvent) === null || _r === void 0 ? void 0 : _r.location) === null || _s === void 0 ? void 0 : _s.id.length) > 0)
                        ? [(_v = (_u = (_t = req.query.reservationFor) === null || _t === void 0 ? void 0 : _t.superEvent) === null || _u === void 0 ? void 0 : _u.location) === null || _v === void 0 ? void 0 : _v.id]
                        : undefined
                },
                workPerformed: {
                    identifiers: (typeof ((_y = (_x = (_w = req.query.reservationFor) === null || _w === void 0 ? void 0 : _w.superEvent) === null || _x === void 0 ? void 0 : _x.workPerformed) === null || _y === void 0 ? void 0 : _y.identifier) === 'string'
                        && ((_1 = (_0 = (_z = req.query.reservationFor) === null || _z === void 0 ? void 0 : _z.superEvent) === null || _0 === void 0 ? void 0 : _0.workPerformed) === null || _1 === void 0 ? void 0 : _1.identifier.length) > 0)
                        ? [(_4 = (_3 = (_2 = req.query.reservationFor) === null || _2 === void 0 ? void 0 : _2.superEvent) === null || _3 === void 0 ? void 0 : _3.workPerformed) === null || _4 === void 0 ? void 0 : _4.identifier]
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
reservationsRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        let applications;
        try {
            const searchApplicationsResult = yield iamService.searchMembers({
                member: { typeOf: { $eq: sdk_1.chevre.factory.creativeWorkType.WebApplication } }
            });
            applications = searchApplicationsResult.data.map((d) => d.member);
        }
        catch (error) {
            // no op
            // 権限がない場合、検索できない
        }
        const searchConditions = createSearchConditions(req);
        const { data } = yield reservationService.search(searchConditions);
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
                let application;
                if (Array.isArray(applications)) {
                    application = applications.find((a) => a.id === clientId);
                }
                const reservationStatusType = reservationStatusType_1.reservationStatusTypes.find((r) => t.reservationStatus === r.codeValue);
                const ticketedSeat = (_d = t.reservedTicket) === null || _d === void 0 ? void 0 : _d.ticketedSeat;
                const ticketedSeatStr = (typeof (ticketedSeat === null || ticketedSeat === void 0 ? void 0 : ticketedSeat.typeOf) === 'string')
                    ? util_1.format('%s %s', (typeof ticketedSeat.seatingType === 'string')
                        ? ticketedSeat.seatingType
                        : (Array.isArray(ticketedSeat.seatingType))
                            ? ticketedSeat.seatingType.join(',')
                            : '', ticketedSeat.seatNumber)
                    : '';
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
        const transactionNumberService = new sdk_1.chevre.service.TransactionNumber({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const expires = moment()
            .add(1, 'minute')
            .toDate();
        for (const id of ids) {
            const { transactionNumber } = yield transactionNumberService.publish({
                project: { id: req.project.id }
            });
            yield cancelReservationService.startAndConfirm({
                typeOf: sdk_1.chevre.factory.assetTransactionType.CancelReservation,
                project: { typeOf: req.project.typeOf, id: req.project.id },
                transactionNumber,
                agent: {
                    typeOf: sdk_1.chevre.factory.personType.Person,
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
        res.json(searchResult.data.map((a) => {
            return Object.assign(Object.assign({}, a), { timeline: TimelineFactory.createFromAction({
                    project: { id: req.project.id },
                    action: a
                }) });
        }));
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
exports.default = reservationsRouter;
