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
 * アクションルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const actionsRouter = express_1.Router();
actionsRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('actions/index', {
        message: '',
        ActionType: sdk_1.chevre.factory.actionType,
        ActionStatusType: sdk_1.chevre.factory.actionStatusType
    });
}));
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(req) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26;
    const paymentMethodAccountIdEq = (_c = (_b = (_a = req.query.object) === null || _a === void 0 ? void 0 : _a.paymentMethod) === null || _b === void 0 ? void 0 : _b.accountId) === null || _c === void 0 ? void 0 : _c.$eq;
    const paymentMethodPaymentMethodIdEq = (_f = (_e = (_d = req.query.object) === null || _d === void 0 ? void 0 : _d.paymentMethod) === null || _e === void 0 ? void 0 : _e.paymentMethodId) === null || _f === void 0 ? void 0 : _f.$eq;
    const paymentMethodTypeEq = (_j = (_h = (_g = req.query.object) === null || _g === void 0 ? void 0 : _g.paymentMethod) === null || _h === void 0 ? void 0 : _h.typeOf) === null || _j === void 0 ? void 0 : _j.$eq;
    const paymentMethodIdEq = (_l = (_k = req.query.object) === null || _k === void 0 ? void 0 : _k.paymentMethodId) === null || _l === void 0 ? void 0 : _l.$eq;
    return {
        limit: req.query.limit,
        page: req.query.page,
        project: { id: { $eq: req.project.id } },
        agent: {
            id: {
                $in: (typeof ((_o = (_m = req.query.agent) === null || _m === void 0 ? void 0 : _m.id) === null || _o === void 0 ? void 0 : _o.$eq) === 'string' && req.query.agent.id.$eq.length > 0)
                    ? [req.query.agent.id.$eq]
                    : undefined
            },
            typeOf: {
                $in: (typeof ((_q = (_p = req.query.agent) === null || _p === void 0 ? void 0 : _p.typeOf) === null || _q === void 0 ? void 0 : _q.$eq) === 'string' && req.query.agent.typeOf.$eq.length > 0)
                    ? [req.query.agent.typeOf.$eq]
                    : undefined
            }
        },
        typeOf: {
            $eq: (typeof ((_r = req.query.typeOf) === null || _r === void 0 ? void 0 : _r.$eq) === 'string' && req.query.typeOf.$eq.length > 0)
                ? req.query.typeOf.$eq
                : undefined
        },
        actionStatus: {
            $in: (typeof ((_s = req.query.actionStatus) === null || _s === void 0 ? void 0 : _s.$eq) === 'string' && req.query.actionStatus.$eq.length > 0)
                ? [req.query.actionStatus.$eq]
                : undefined
        },
        location: {
            identifier: {
                $eq: (typeof ((_u = (_t = req.query.location) === null || _t === void 0 ? void 0 : _t.identifier) === null || _u === void 0 ? void 0 : _u.$eq) === 'string' && req.query.location.identifier.$eq.length > 0)
                    ? req.query.location.identifier.$eq
                    : undefined
            }
        },
        object: {
            event: {
                id: {
                    $in: (typeof ((_x = (_w = (_v = req.query.object) === null || _v === void 0 ? void 0 : _v.event) === null || _w === void 0 ? void 0 : _w.id) === null || _x === void 0 ? void 0 : _x.$eq) === 'string'
                        && req.query.object.event.id.$eq.length > 0)
                        ? [req.query.object.event.id.$eq]
                        : undefined
                }
            },
            reservationFor: {
                id: {
                    $eq: (typeof ((_0 = (_z = (_y = req.query.object) === null || _y === void 0 ? void 0 : _y.reservationFor) === null || _z === void 0 ? void 0 : _z.id) === null || _0 === void 0 ? void 0 : _0.$eq) === 'string'
                        && req.query.object.reservationFor.id.$eq.length > 0)
                        ? req.query.object.reservationFor.id.$eq
                        : undefined
                }
            },
            paymentMethod: {
                accountId: {
                    $eq: (typeof paymentMethodAccountIdEq === 'string' && paymentMethodAccountIdEq.length > 0)
                        ? paymentMethodAccountIdEq
                        : undefined
                },
                paymentMethodId: {
                    $eq: (typeof paymentMethodPaymentMethodIdEq === 'string' && paymentMethodPaymentMethodIdEq.length > 0)
                        ? paymentMethodPaymentMethodIdEq
                        : undefined
                },
                typeOf: {
                    $eq: (typeof paymentMethodTypeEq === 'string' && paymentMethodTypeEq.length > 0)
                        ? paymentMethodTypeEq
                        : undefined
                }
            },
            paymentMethodId: {
                $eq: (typeof paymentMethodIdEq === 'string' && paymentMethodIdEq.length > 0)
                    ? paymentMethodIdEq
                    : undefined
            },
            typeOf: {
                $eq: (typeof ((_2 = (_1 = req.query.object) === null || _1 === void 0 ? void 0 : _1.typeOf) === null || _2 === void 0 ? void 0 : _2.$eq) === 'string' && req.query.object.typeOf.$eq.length > 0)
                    ? req.query.object.typeOf.$eq
                    : undefined
            },
            id: {
                $eq: (typeof ((_4 = (_3 = req.query.object) === null || _3 === void 0 ? void 0 : _3.id) === null || _4 === void 0 ? void 0 : _4.$eq) === 'string' && req.query.object.id.$eq.length > 0)
                    ? req.query.object.id.$eq
                    : undefined
            },
            orderNumber: {
                $in: (typeof ((_6 = (_5 = req.query.object) === null || _5 === void 0 ? void 0 : _5.orderNumber) === null || _6 === void 0 ? void 0 : _6.$eq) === 'string' && req.query.object.orderNumber.$eq.length > 0)
                    ? [req.query.object.orderNumber.$eq]
                    : undefined
            },
            acceptedOffer: {
                ticketedSeat: {
                    seatNumber: {
                        $in: (typeof ((_10 = (_9 = (_8 = (_7 = req.query.object) === null || _7 === void 0 ? void 0 : _7.acceptedOffer) === null || _8 === void 0 ? void 0 : _8.ticketedSeat) === null || _9 === void 0 ? void 0 : _9.seatNumber) === null || _10 === void 0 ? void 0 : _10.$eq) === 'string'
                            && req.query.object.acceptedOffer.ticketedSeat.seatNumber.$eq.length > 0)
                            ? [req.query.object.acceptedOffer.ticketedSeat.seatNumber.$eq]
                            : undefined
                    }
                }
            }
        },
        purpose: {
            typeOf: {
                $in: (typeof ((_12 = (_11 = req.query.purpose) === null || _11 === void 0 ? void 0 : _11.typeOf) === null || _12 === void 0 ? void 0 : _12.$eq) === 'string' && req.query.purpose.typeOf.$eq.length > 0)
                    ? [req.query.purpose.typeOf.$eq]
                    : undefined
            },
            id: {
                $in: (typeof ((_14 = (_13 = req.query.purpose) === null || _13 === void 0 ? void 0 : _13.id) === null || _14 === void 0 ? void 0 : _14.$eq) === 'string' && req.query.purpose.id.$eq.length > 0)
                    ? [req.query.purpose.id.$eq]
                    : undefined
            },
            orderNumber: {
                $in: (typeof ((_16 = (_15 = req.query.purpose) === null || _15 === void 0 ? void 0 : _15.orderNumber) === null || _16 === void 0 ? void 0 : _16.$eq) === 'string' && req.query.purpose.orderNumber.$eq.length > 0)
                    ? [req.query.purpose.orderNumber.$eq]
                    : undefined
            }
        },
        result: {
            typeOf: {
                $in: (typeof ((_18 = (_17 = req.query.result) === null || _17 === void 0 ? void 0 : _17.typeOf) === null || _18 === void 0 ? void 0 : _18.$eq) === 'string' && req.query.result.typeOf.$eq.length > 0)
                    ? [req.query.result.typeOf.$eq]
                    : undefined
            },
            id: {
                $in: (typeof ((_20 = (_19 = req.query.result) === null || _19 === void 0 ? void 0 : _19.id) === null || _20 === void 0 ? void 0 : _20.$eq) === 'string' && req.query.result.id.$eq.length > 0)
                    ? [req.query.result.id.$eq]
                    : undefined
            },
            orderNumber: {
                $in: (typeof ((_22 = (_21 = req.query.result) === null || _21 === void 0 ? void 0 : _21.orderNumber) === null || _22 === void 0 ? void 0 : _22.$eq) === 'string' && req.query.result.orderNumber.$eq.length > 0)
                    ? [req.query.result.orderNumber.$eq]
                    : undefined
            }
        },
        fromLocation: {
            accountNumber: {
                $in: (typeof ((_24 = (_23 = req.query.fromLocation) === null || _23 === void 0 ? void 0 : _23.accountNumber) === null || _24 === void 0 ? void 0 : _24.$eq) === 'string'
                    && req.query.fromLocation.accountNumber.$eq.length > 0)
                    ? [req.query.fromLocation.accountNumber.$eq]
                    : undefined
            }
        },
        toLocation: {
            accountNumber: {
                $in: (typeof ((_26 = (_25 = req.query.toLocation) === null || _25 === void 0 ? void 0 : _25.accountNumber) === null || _26 === void 0 ? void 0 : _26.$eq) === 'string'
                    && req.query.toLocation.accountNumber.$eq.length > 0)
                    ? [req.query.toLocation.accountNumber.$eq]
                    : undefined
            }
        }
    };
}
actionsRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const actionService = new sdk_1.chevre.service.Action({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = createSearchConditions(req);
        const { data } = yield actionService.search(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((a) => {
                var _a, _b;
                const objectType = (Array.isArray(a.object)) ? (_a = a.object[0]) === null || _a === void 0 ? void 0 : _a.typeOf : a.object.typeOf;
                const objectId = (Array.isArray(a.object)) ? (_b = a.object[0]) === null || _b === void 0 ? void 0 : _b.id : a.object.id;
                const resultType = (a.result !== undefined && a.result !== null) ? '表示' : '';
                const errorType = (a.error !== undefined && a.error !== null) ? '表示' : '';
                const purposeType = (a.purpose !== undefined && a.purpose !== null)
                    ? String(a.purpose.typeOf)
                    : '';
                const instrumentType = (a.instrument !== undefined && a.instrument !== null)
                    ? String(a.instrument.typeOf)
                    : '';
                return Object.assign(Object.assign({}, a), { objectType,
                    objectId,
                    resultType,
                    errorType,
                    purposeType,
                    instrumentType });
            })
        });
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
exports.default = actionsRouter;
