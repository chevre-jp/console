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
 * 経理レポートルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
function createSearchConditions(req) {
    var _a;
    return Object.assign({ limit: Number(req.query.limit), page: Number(req.query.page), project: { id: { $eq: req.project.id } }, order: Object.assign(Object.assign({}, (typeof req.query.orderNumber === 'string' && req.query.orderNumber.length > 0)
            ? { orderNumber: { $eq: req.query.orderNumber } }
            : undefined), { paymentMethods: Object.assign({}, (typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                ? { paymentMethodId: { $eq: req.query.paymentMethodId } }
                : undefined), orderDate: {
                $gte: (typeof req.query.orderFrom === 'string' && req.query.orderFrom.length > 0)
                    ? moment(`${String(req.query.orderFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                $lte: (typeof req.query.orderThrough === 'string' && req.query.orderThrough.length > 0)
                    ? moment(`${String(req.query.orderThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                    : undefined
            }, acceptedOffers: {
                itemOffered: {
                    reservationFor: {
                        startDate: {
                            $gte: (typeof req.query.reservationForStartFrom === 'string'
                                && req.query.reservationForStartFrom.length > 0)
                                ? moment(`${String(req.query.reservationForStartFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                                    .toDate()
                                : undefined,
                            $lte: (typeof req.query.reservationForStartThrough === 'string'
                                && req.query.reservationForStartThrough.length > 0)
                                ? moment(`${String(req.query.reservationForStartThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                                    .add(1, 'day')
                                    .toDate()
                                : undefined
                        }
                    }
                }
            }, seller: Object.assign({}, (typeof ((_a = req.query.seller) === null || _a === void 0 ? void 0 : _a.id) === 'string' && req.query.seller.id.length > 0)
                ? { id: { $eq: req.query.seller.id } }
                : undefined) }) }, (req.query.unwindAcceptedOffers === '1') ? { $unwindAcceptedOffers: '1' } : undefined);
}
const hiddenIdentifierNames = [
    'tokenIssuer',
    'hostname',
    'sub',
    'token_use',
    'auth_time',
    'iss',
    'exp',
    'iat',
    'version',
    'jti',
    'client_id',
    'username',
    'cognito:groups'
];
const accountingReportsRouter = express_1.Router();
accountingReportsRouter.get('', 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const accountingReportService = new sdk_1.chevre.service.AccountingReport({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        if (req.query.format === 'datatable') {
            const searchConditions = createSearchConditions(req);
            const searchResult = yield accountingReportService.search(searchConditions);
            searchResult.data = searchResult.data.map((a) => {
                var _a, _b, _c, _d, _e;
                const order = a.isPartOf.mainEntity;
                let clientId = (order.customer.typeOf === sdk_1.chevre.factory.creativeWorkType.WebApplication)
                    ? order.customer.id
                    : '';
                if (Array.isArray(order.customer.identifier)) {
                    const clientIdPropertyValue = (_a = order.customer.identifier.find((p) => p.name === 'clientId')) === null || _a === void 0 ? void 0 : _a.value;
                    if (typeof clientIdPropertyValue === 'string') {
                        clientId = clientIdPropertyValue;
                    }
                }
                let itemType = [];
                let itemTypeStr = '';
                if (Array.isArray(order.acceptedOffers) && order.acceptedOffers.length > 0) {
                    // itemTypeStr = order.acceptedOffers[0].itemOffered.typeOf;
                    // itemTypeStr += ` x ${order.acceptedOffers.length}`;
                    // itemType = order.acceptedOffers.map((o) => o.itemOffered.typeOf);
                    itemType = order.acceptedOffers.map((o) => {
                        var _a;
                        if (o.itemOffered.typeOf === sdk_1.chevre.factory.actionType.MoneyTransfer) {
                            return o.itemOffered.typeOf;
                        }
                        else {
                            return String((_a = o.itemOffered.issuedThrough) === null || _a === void 0 ? void 0 : _a.typeOf);
                        }
                    });
                    itemTypeStr = itemType[0];
                }
                else if (!Array.isArray(order.acceptedOffers) && typeof order.acceptedOffers.typeOf === 'string') {
                    itemTypeStr = order.acceptedOffers.itemOffered.typeOf;
                    // itemType = [(<any>order.acceptedOffers).itemOffered.typeOf];
                    if (order.acceptedOffers.itemOffered.typeOf === sdk_1.chevre.factory.actionType.MoneyTransfer) {
                        itemType = [order.acceptedOffers.itemOffered.typeOf];
                    }
                    else {
                        itemType = [String((_c = (_b = order.acceptedOffers.itemOffered) === null || _b === void 0 ? void 0 : _b.issuedThrough) === null || _c === void 0 ? void 0 : _c.typeOf)];
                    }
                    itemTypeStr = itemType[0];
                }
                if (a.mainEntity.typeOf === sdk_1.chevre.factory.actionType.PayAction
                    && a.mainEntity.purpose.typeOf === sdk_1.chevre.factory.actionType.ReturnAction) {
                    itemType = ['ReturnFee'];
                    itemTypeStr = 'ReturnFee';
                }
                let eventStartDates = [];
                if (Array.isArray(order.acceptedOffers)) {
                    eventStartDates = order.acceptedOffers
                        .filter((o) => o.itemOffered.typeOf === sdk_1.chevre.factory.reservationType.EventReservation)
                        .map((o) => o.itemOffered.reservationFor.startDate);
                    eventStartDates = [...new Set(eventStartDates)];
                }
                else if (((_e = (_d = order.acceptedOffers) === null || _d === void 0 ? void 0 : _d.itemOffered) === null || _e === void 0 ? void 0 : _e.typeOf) === sdk_1.chevre.factory.reservationType.EventReservation) {
                    eventStartDates = [order.acceptedOffers.itemOffered.reservationFor.startDate];
                }
                // 不要なidentifierを非表示に
                let customerIdentifier = (Array.isArray(order.customer.identifier))
                    ? order.customer.identifier
                    : [];
                customerIdentifier = customerIdentifier.filter((p) => {
                    return !hiddenIdentifierNames.includes(p.name);
                });
                return Object.assign(Object.assign({}, a), { isPartOf: Object.assign(Object.assign({}, a.isPartOf), { mainEntity: Object.assign(Object.assign({}, a.isPartOf.mainEntity), { customer: Object.assign(Object.assign({}, a.isPartOf.mainEntity.customer), { identifier: customerIdentifier }) }) }), 
                    // amount,
                    itemType,
                    itemTypeStr,
                    eventStartDates, eventStartDatesStr: eventStartDates.map((d) => {
                        return moment(d)
                            .tz('Asia/Tokyo')
                            .format('YY-MM-DD HH:mm:ssZ');
                    })
                        .join(','), clientId });
            });
            res.json({
                success: true,
                count: (searchResult.data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                results: searchResult.data
            });
        }
        else {
            res.render('accountingReports/index', {
                moment: moment,
                query: req.query
                // extractScripts: true
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
exports.default = accountingReportsRouter;
