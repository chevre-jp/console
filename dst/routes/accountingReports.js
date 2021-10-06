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
const accountingReportsRouter = express_1.Router();
accountingReportsRouter.get('', 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const accountingReportService = new sdk_1.chevre.service.AccountingReport({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page
        };
        if (req.query.format === 'datatable') {
            const conditions = Object.assign({ limit: Number(searchConditions.limit), page: Number(searchConditions.page), project: { id: { $eq: req.project.id } }, order: Object.assign(Object.assign(Object.assign({}, (typeof req.query.orderNumber === 'string' && req.query.orderNumber.length > 0)
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
                    } }), {
                    seller: Object.assign({}, (typeof ((_a = req.query.seller) === null || _a === void 0 ? void 0 : _a.id) === 'string' && req.query.seller.id.length > 0)
                        ? { id: { $eq: req.query.seller.id } }
                        : undefined)
                }) }, (req.query.unwindAcceptedOffers === '1') ? { $unwindAcceptedOffers: '1' } : undefined);
            const searchResult = yield accountingReportService.search(conditions);
            searchResult.data = searchResult.data.map((a) => {
                var _a, _b, _c;
                const order = a.isPartOf.mainEntity;
                let clientId = '';
                if (Array.isArray(order.customer.identifier)) {
                    const clientIdPropertyValue = (_a = order.customer.identifier.find((p) => p.name === 'clientId')) === null || _a === void 0 ? void 0 : _a.value;
                    if (typeof clientIdPropertyValue === 'string') {
                        clientId = clientIdPropertyValue;
                    }
                }
                let itemType = [];
                let itemTypeStr = '';
                if (Array.isArray(order.acceptedOffers) && order.acceptedOffers.length > 0) {
                    itemTypeStr = order.acceptedOffers[0].itemOffered.typeOf;
                    itemTypeStr += ` x ${order.acceptedOffers.length}`;
                    itemType = order.acceptedOffers.map((o) => o.itemOffered.typeOf);
                }
                else if (!Array.isArray(order.acceptedOffers) && typeof order.acceptedOffers.typeOf === 'string') {
                    itemType = [order.acceptedOffers.itemOffered.typeOf];
                    itemTypeStr = order.acceptedOffers.itemOffered.typeOf;
                }
                if (a.mainEntity.typeOf === sdk_1.chevre.factory.actionType.PayAction
                    && a.mainEntity.purpose.typeOf === sdk_1.chevre.factory.actionType.ReturnAction) {
                    itemType = ['ReturnFee'];
                    itemTypeStr = 'ReturnFee';
                }
                // let amount;
                // if (typeof (<any>a).object?.paymentMethod?.totalPaymentDue?.value === 'number') {
                //     amount = (<any>a).object.paymentMethod.totalPaymentDue.value;
                // }
                let eventStartDates = [];
                if (Array.isArray(order.acceptedOffers)) {
                    eventStartDates = order.acceptedOffers
                        .filter((o) => o.itemOffered.typeOf === sdk_1.chevre.factory.reservationType.EventReservation)
                        .map((o) => o.itemOffered.reservationFor.startDate);
                    eventStartDates = [...new Set(eventStartDates)];
                }
                else if (((_c = (_b = order.acceptedOffers) === null || _b === void 0 ? void 0 : _b.itemOffered) === null || _c === void 0 ? void 0 : _c.typeOf) === sdk_1.chevre.factory.reservationType.EventReservation) {
                    eventStartDates = [order.acceptedOffers.itemOffered.reservationFor.startDate];
                }
                return Object.assign(Object.assign({}, a), { 
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
            // } else if (req.query.format === chevreapi.factory.chevre.encodingFormat.Text.csv) {
            //     const stream = <NodeJS.ReadableStream>await streamingOrderService.download({
            //         ...searchConditions,
            //         format: chevreapi.factory.chevre.encodingFormat.Text.csv,
            //         limit: undefined,
            //         page: undefined
            //     });
            //     const filename = 'OrderReport';
            //     res.setHeader('Content-disposition', `attachment; filename*=UTF-8\'\'${encodeURIComponent(`${filename}.csv`)}`);
            //     res.setHeader('Content-Type', `${chevreapi.factory.chevre.encodingFormat.Text.csv}; charset=UTF-8`);
            //     stream.pipe(res);
            // } else if (req.query.format === chevreapi.factory.chevre.encodingFormat.Application.json) {
            //     const stream = <NodeJS.ReadableStream>await streamingOrderService.download({
            //         ...searchConditions,
            //         format: chevreapi.factory.chevre.encodingFormat.Application.json,
            //         limit: undefined,
            //         page: undefined
            //     });
            //     const filename = 'OrderReport';
            //     res.setHeader('Content-disposition', `attachment; filename*=UTF-8\'\'${encodeURIComponent(`${filename}.json`)}`);
            //     res.setHeader('Content-Type', `${chevreapi.factory.chevre.encodingFormat.Application.json}; charset=UTF-8`);
            //     stream.pipe(res);
        }
        else {
            res.render('accountingReports/index', {
                moment: moment,
                query: req.query,
                searchConditions: searchConditions
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
