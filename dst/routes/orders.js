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
 * 注文ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const orderStatusType_1 = require("../factory/orderStatusType");
const productType_1 = require("../factory/productType");
const TimelineFactory = require("../factory/timeline");
const ordersRouter = express_1.Router();
ordersRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('orders/index', {
        message: '',
        orderStatusTypes: orderStatusType_1.orderStatusTypes,
        productTypes: productType_1.productTypes
    });
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11;
    const customerIdentifierAll = [];
    if (typeof req.query.application === 'string' && req.query.application.length > 0) {
        customerIdentifierAll.push({ name: 'clientId', value: req.query.application });
    }
    if (typeof ((_a = req.query.customer) === null || _a === void 0 ? void 0 : _a.identifier) === 'string' && req.query.customer.identifier.length > 0) {
        const splitted = req.query.customer.identifier.split(':');
        if (splitted.length > 1) {
            customerIdentifierAll.push({
                name: splitted[0],
                value: splitted[1]
            });
        }
    }
    // let underNameIdEq: string | undefined;
    // if (typeof req.query.underName?.id === 'string' && req.query.underName?.id.length > 0) {
    //     underNameIdEq = req.query.underName?.id;
    // }
    let customerAdditionalPropertyIn;
    if (typeof ((_c = (_b = req.query.customer) === null || _b === void 0 ? void 0 : _b.additionalProperty) === null || _c === void 0 ? void 0 : _c.$in) === 'string' && req.query.customer.additionalProperty.$in.length > 0) {
        const splitted = req.query.customer.additionalProperty.$in.split(':');
        if (splitted.length > 1) {
            customerAdditionalPropertyIn = [
                {
                    name: splitted[0],
                    value: splitted[1]
                }
            ];
        }
    }
    let paymentMethodsAdditionalPropertyAll;
    if (typeof ((_e = (_d = req.query.paymentMethods) === null || _d === void 0 ? void 0 : _d.additionalProperty) === null || _e === void 0 ? void 0 : _e.$all) === 'string'
        && req.query.paymentMethods.additionalProperty.$all.length > 0) {
        const splitted = req.query.paymentMethods.additionalProperty.$all.split(':');
        if (splitted.length > 1) {
            paymentMethodsAdditionalPropertyAll = [
                {
                    name: splitted[0],
                    value: splitted[1]
                }
            ];
        }
    }
    let identifiers;
    if (typeof ((_f = req.query.identifier) === null || _f === void 0 ? void 0 : _f.$in) === 'string' && req.query.identifier.$in.length > 0) {
        const splitted = req.query.identifier.$in.split(':');
        if (splitted.length > 1) {
            identifiers = [
                {
                    name: splitted[0],
                    value: splitted[1]
                }
            ];
        }
    }
    return {
        limit: req.query.limit,
        page: req.query.page,
        sort: { orderDate: sdk_1.chevre.factory.sortType.Descending },
        project: { id: { $eq: req.project.id } },
        identifier: { $in: (Array.isArray(identifiers) && identifiers.length > 0) ? identifiers : undefined },
        confirmationNumbers: (typeof req.query.confirmationNumber === 'string' && req.query.confirmationNumber.length > 0)
            ? [req.query.confirmationNumber]
            : undefined,
        name: {
            $regex: (typeof ((_g = req.query.name) === null || _g === void 0 ? void 0 : _g.$regex) === 'string' && req.query.name.$regex.length > 0)
                ? req.query.name.$regex
                : undefined
        },
        orderStatuses: (req.query.orderStatus !== undefined && req.query.orderStatus !== '')
            ? [req.query.orderStatus]
            : undefined,
        orderNumbers: (typeof req.query.orderNumber === 'string' && req.query.orderNumber.length > 0)
            ? [req.query.orderNumber]
            : undefined,
        orderDate: {
            $gte: (typeof req.query.orderFrom === 'string' && req.query.orderFrom.length > 0)
                ? moment(`${String(req.query.orderFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            $lte: (typeof req.query.orderThrough === 'string' && req.query.orderThrough.length > 0)
                ? moment(`${String(req.query.orderThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate()
                : undefined
        },
        customer: {
            memberOf: {
                membershipNumber: {
                    $eq: (typeof ((_h = req.query.customer) === null || _h === void 0 ? void 0 : _h.membershipNumber) === 'string'
                        && req.query.customer.membershipNumber.length > 0)
                        ? req.query.customer.membershipNumber
                        : undefined
                }
            },
            ids: (typeof ((_j = req.query.customer) === null || _j === void 0 ? void 0 : _j.id) === 'string' && req.query.customer.id.length > 0)
                ? [req.query.customer.id]
                : (typeof req.query.customerId === 'string' && req.query.customerId.length > 0)
                    ? [req.query.customerId]
                    : undefined,
            familyName: (typeof ((_k = req.query.customer) === null || _k === void 0 ? void 0 : _k.familyName) === 'string' && req.query.customer.familyName.length > 0)
                ? { $regex: req.query.customer.familyName }
                : undefined,
            givenName: (typeof ((_l = req.query.customer) === null || _l === void 0 ? void 0 : _l.givenName) === 'string' && req.query.customer.givenName.length > 0)
                ? { $regex: req.query.customer.givenName }
                : undefined,
            email: (typeof ((_m = req.query.customer) === null || _m === void 0 ? void 0 : _m.email) === 'string' && req.query.customer.email.length > 0)
                ? { $regex: req.query.customer.email }
                : undefined,
            telephone: (typeof ((_o = req.query.customer) === null || _o === void 0 ? void 0 : _o.telephone) === 'string' && req.query.customer.telephone.length > 0)
                ? { $regex: req.query.customer.telephone }
                : undefined,
            additionalProperty: {
                $in: customerAdditionalPropertyIn
            },
            identifier: {
                $all: (customerIdentifierAll.length > 0) ? customerIdentifierAll : undefined
            }
        },
        seller: {
            ids: (typeof req.query.seller === 'string' && req.query.seller.length > 0)
                ? [req.query.seller]
                : undefined
        },
        acceptedOffers: {
            itemOffered: {
                typeOf: {
                    $in: (typeof ((_p = req.query.itemOffered) === null || _p === void 0 ? void 0 : _p.typeOf) === 'string' && req.query.itemOffered.typeOf.length > 0)
                        ? [req.query.itemOffered.typeOf]
                        : undefined
                },
                identifier: {
                    $in: (typeof ((_q = req.query.itemOffered) === null || _q === void 0 ? void 0 : _q.identifier) === 'string' && req.query.itemOffered.identifier.length > 0)
                        ? [req.query.itemOffered.identifier]
                        : undefined
                },
                issuedThrough: {
                    id: {
                        $in: (typeof ((_s = (_r = req.query.itemOffered) === null || _r === void 0 ? void 0 : _r.issuedThrough) === null || _s === void 0 ? void 0 : _s.id) === 'string'
                            && req.query.itemOffered.issuedThrough.id.length > 0)
                            ? [req.query.itemOffered.issuedThrough.id]
                            : undefined
                    },
                    typeOf: {
                        $eq: (typeof ((_u = (_t = req.query.itemOffered) === null || _t === void 0 ? void 0 : _t.issuedThrough) === null || _u === void 0 ? void 0 : _u.typeOf) === 'string'
                            && req.query.itemOffered.issuedThrough.typeOf.length > 0)
                            ? req.query.itemOffered.issuedThrough.typeOf
                            : undefined
                    }
                },
                programMembershipUsed: {
                    identifier: {
                        $eq: (typeof ((_v = req.query.programMembershipUsed) === null || _v === void 0 ? void 0 : _v.identifier) === 'string'
                            && req.query.programMembershipUsed.identifier.length > 0)
                            ? req.query.programMembershipUsed.identifier
                            : undefined
                    },
                    issuedThrough: {
                        serviceType: {
                            codeValue: {
                                $eq: (typeof ((_y = (_x = (_w = req.query.programMembershipUsed) === null || _w === void 0 ? void 0 : _w.issuedThrough) === null || _x === void 0 ? void 0 : _x.serviceType) === null || _y === void 0 ? void 0 : _y.codeValue) === 'string'
                                    && req.query.programMembershipUsed.issuedThrough.serviceType.codeValue.length > 0)
                                    ? req.query.programMembershipUsed.issuedThrough.serviceType.codeValue
                                    : undefined
                            }
                        }
                    }
                },
                ids: (typeof ((_z = req.query.itemOffered) === null || _z === void 0 ? void 0 : _z.id) === 'string' && req.query.itemOffered.id.length > 0)
                    ? [req.query.itemOffered.id]
                    : undefined,
                reservationNumbers: (typeof req.query.reservationNumber === 'string' && req.query.reservationNumber.length > 0)
                    ? [req.query.reservationNumber]
                    : undefined,
                reservationFor: {
                    ids: (typeof ((_0 = req.query.reservationFor) === null || _0 === void 0 ? void 0 : _0.id) === 'string' && req.query.reservationFor.id.length > 0)
                        ? [req.query.reservationFor.id]
                        : undefined,
                    name: (typeof ((_1 = req.query.reservationFor) === null || _1 === void 0 ? void 0 : _1.name) === 'string' && req.query.reservationFor.name.length > 0)
                        ? req.query.reservationFor.name
                        : undefined,
                    startFrom: (typeof req.query.reservationForStartFrom === 'string'
                        && req.query.reservationForStartFrom.length > 0)
                        ? moment(`${String(req.query.reservationForStartFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .toDate()
                        : undefined,
                    startThrough: (typeof req.query.reservationForStartThrough === 'string'
                        && req.query.reservationForStartThrough.length > 0)
                        ? moment(`${String(req.query.reservationForStartThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .add(1, 'day')
                            .toDate()
                        : undefined,
                    superEvent: {
                        ids: (typeof ((_3 = (_2 = req.query.reservationFor) === null || _2 === void 0 ? void 0 : _2.superEvent) === null || _3 === void 0 ? void 0 : _3.id) === 'string'
                            && req.query.reservationFor.superEvent.id.length > 0)
                            ? [req.query.reservationFor.superEvent.id]
                            : undefined,
                        workPerformed: {
                            identifiers: (typeof ((_5 = (_4 = req.query.reservationFor) === null || _4 === void 0 ? void 0 : _4.workPerformed) === null || _5 === void 0 ? void 0 : _5.identifier) === 'string'
                                && req.query.reservationFor.workPerformed.identifier.length > 0)
                                ? [req.query.reservationFor.workPerformed.identifier]
                                : undefined
                        }
                    }
                }
            }
        },
        paymentMethods: {
            typeOfs: (typeof req.query.paymentMethodType === 'string' && req.query.paymentMethodType.length > 0)
                ? [req.query.paymentMethodType]
                : undefined,
            accountIds: (typeof ((_6 = req.query.paymentMethod) === null || _6 === void 0 ? void 0 : _6.accountId) === 'string' && req.query.paymentMethod.accountId.length > 0)
                ? [req.query.paymentMethod.accountId]
                : undefined,
            paymentMethodIds: (typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                ? [req.query.paymentMethodId]
                : undefined,
            additionalProperty: {
                $all: (Array.isArray(paymentMethodsAdditionalPropertyAll)) ? paymentMethodsAdditionalPropertyAll : undefined
            }
        },
        price: {
            $gte: (typeof ((_7 = req.query.price) === null || _7 === void 0 ? void 0 : _7.$gte) === 'string' && req.query.price.$gte.length > 0)
                ? Number(req.query.price.$gte)
                : undefined,
            $lte: (typeof ((_8 = req.query.price) === null || _8 === void 0 ? void 0 : _8.$lte) === 'string' && req.query.price.$lte.length > 0)
                ? Number(req.query.price.$lte)
                : undefined
        },
        broker: {
            id: {
                $eq: (typeof ((_9 = req.query.broker) === null || _9 === void 0 ? void 0 : _9.id) === 'string' && ((_10 = req.query.broker) === null || _10 === void 0 ? void 0 : _10.id.length) > 0)
                    ? (_11 = req.query.broker) === null || _11 === void 0 ? void 0 : _11.id : undefined
            }
        }
    };
}
ordersRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderService = new sdk_1.chevre.service.Order({
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
        const searchConditions = createSearchConditions(req);
        const { data } = yield orderService.search(Object.assign(Object.assign(Object.assign({}, searchConditions), (req.query.unwindAcceptedOffers === '1') ? { $unwindAcceptedOffers: '1' } : undefined), { $projection: {
                acceptedOffers: 0
            } }));
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((order) => {
                var _a, _b, _c, _d;
                let clientId;
                if (Array.isArray((_a = order.customer) === null || _a === void 0 ? void 0 : _a.identifier)) {
                    clientId = (_c = (_b = order.customer) === null || _b === void 0 ? void 0 : _b.identifier.find((i) => i.name === 'clientId')) === null || _c === void 0 ? void 0 : _c.value;
                }
                const application = applications.find((a) => a.id === clientId);
                // const numItems = (Array.isArray(order.acceptedOffers)) ? order.acceptedOffers.length : 0;
                const numPaymentMethods = (Array.isArray(order.paymentMethods)) ? order.paymentMethods.length : 0;
                const numIdentifiers = (Array.isArray(order.identifier)) ? order.identifier.length : 0;
                // let itemType: string[] = [];
                // let itemTypeStr: string = '';
                if (Array.isArray(order.acceptedOffers) && order.acceptedOffers.length > 0) {
                    // itemTypeStr = order.acceptedOffers[0].itemOffered.typeOf;
                    // itemTypeStr += ` x ${order.acceptedOffers.length}`;
                    // itemType = order.acceptedOffers.map((o) => o.itemOffered.typeOf);
                }
                let paymentMethodTypeStr = '';
                if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
                    paymentMethodTypeStr = order.paymentMethods.map((p) => p.typeOf)
                        .join(',');
                }
                const numOrderedItems = (Array.isArray(order.orderedItem)) ? order.orderedItem.length : 0;
                const orderedItemsStr = (_d = order.orderedItem) === null || _d === void 0 ? void 0 : _d.map((i) => {
                    return i.orderedItem.typeOf;
                }).join(' ');
                return Object.assign(Object.assign({}, order), { application: application, 
                    // numItems,
                    numPaymentMethods,
                    numIdentifiers,
                    // itemType,
                    // itemTypeStr,
                    paymentMethodTypeStr,
                    numOrderedItems,
                    orderedItemsStr });
            })
        });
    }
    catch (err) {
        res.json({
            message: err.message,
            success: false,
            count: 0,
            results: []
        });
    }
}));
ordersRouter.get('/searchAdmins', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
ordersRouter.get('/:orderNumber/acceptedOffers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderService = new sdk_1.chevre.service.Order({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const acceptedOffers = yield orderService.searchAcceptedOffersByOrderNumber({
            orderNumber: req.params.orderNumber
        }, {
            limit: 100,
            page: 1
        });
        res.json(acceptedOffers);
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
}));
ordersRouter.get('/:orderNumber/actions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderService = new sdk_1.chevre.service.Order({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const actions = yield orderService.searchActionsByOrderNumber({
            orderNumber: req.params.orderNumber,
            sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
        });
        res.json(actions.map((a) => {
            return Object.assign(Object.assign({}, a), { timeline: TimelineFactory.createFromAction({
                    project: { id: req.project.id },
                    action: a
                }) });
        }));
    }
    catch (error) {
        res.status((typeof error.code === 'number') ? error.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({ message: error.message });
    }
}));
/**
 * 注文詳細
 */
ordersRouter.get('/:orderNumber', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderService = new sdk_1.chevre.service.Order({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const order = yield orderService.findByOrderNumber({ orderNumber: req.params.orderNumber }, {
            $projection: {
                acceptedOffers: 0
            }
        });
        let actionsOnOrder = [];
        let timelines = [];
        try {
            actionsOnOrder = yield orderService.searchActionsByOrderNumber({
                orderNumber: order.orderNumber,
                sort: { startDate: sdk_1.chevre.factory.sortType.Ascending }
            });
            timelines = actionsOnOrder.map((a) => {
                return TimelineFactory.createFromAction({
                    project: req.project,
                    action: a
                });
            });
        }
        catch (error) {
            // no op
        }
        res.render('orders/details', {
            moment: moment,
            order: order,
            timelines: timelines,
            ActionStatusType: sdk_1.chevre.factory.actionStatusType
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文返品
 */
ordersRouter.post('/:orderNumber/return', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const returnOrderService = new sdk_1.chevre.service.transaction.ReturnOrder({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const returnOrderTransaction = yield returnOrderService.start({
            expires: moment()
                .add(1, 'minutes')
                .toDate(),
            object: {
                order: {
                    confirmationNumber: req.body.confirmationNumber,
                    orderNumber: req.params.orderNumber
                }
            }
        });
        yield returnOrderService.confirm({
            id: returnOrderTransaction.id,
            potentialActions: {
                returnOrder: {
                    potentialActions: {}
                }
            }
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({
            message: error.message
        });
    }
}));
exports.default = ordersRouter;
