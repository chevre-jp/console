/**
 * 注文ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import { orderStatusTypes } from '../factory/orderStatusType';
import * as TimelineFactory from '../factory/timeline';

const ordersRouter = Router();

ordersRouter.get(
    '',
    async (__, res) => {
        res.render('orders/index', {
            message: '',
            orderStatusTypes
        });
    }
);

ordersRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        try {
            const orderService = new chevre.service.Order({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchApplicationsResult = await iamService.searchMembers({
                member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
            });
            const applications = searchApplicationsResult.data.map((d) => d.member);

            const customerIdentifierAll: chevre.factory.propertyValue.IPropertyValue<string>[] = [];
            if (typeof req.query.application === 'string' && req.query.application.length > 0) {
                customerIdentifierAll.push({ name: 'clientId', value: req.query.application });
            }
            if (typeof req.query.customer?.identifier === 'string' && req.query.customer.identifier.length > 0) {
                const splitted = (<string>req.query.customer.identifier).split(':');
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

            let customerAdditionalPropertyIn: chevre.factory.person.IIdentifier | undefined;
            if (typeof req.query.customer?.additionalProperty?.$in === 'string' && req.query.customer.additionalProperty.$in.length > 0) {
                const splitted = (<string>req.query.customer.additionalProperty.$in).split(':');
                if (splitted.length > 1) {
                    customerAdditionalPropertyIn = [
                        {
                            name: splitted[0],
                            value: splitted[1]
                        }
                    ];
                }
            }

            let identifiers: chevre.factory.order.IIdentifier | undefined;
            if (typeof req.query.identifier?.$in === 'string' && req.query.identifier.$in.length > 0) {
                const splitted = (<string>req.query.identifier.$in).split(':');
                if (splitted.length > 1) {
                    identifiers = [
                        {
                            name: splitted[0],
                            value: splitted[1]
                        }
                    ];
                }
            }
            const searchConditions: chevre.factory.order.ISearchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                sort: { orderDate: chevre.factory.sortType.Descending },
                project: { id: { $eq: req.project.id } },
                identifier: { $in: (Array.isArray(identifiers) && identifiers.length > 0) ? identifiers : undefined },
                confirmationNumbers: (typeof req.query.confirmationNumber === 'string' && req.query.confirmationNumber.length > 0)
                    ? [req.query.confirmationNumber]
                    : undefined,
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
                            $eq: (typeof req.query.customer?.membershipNumber === 'string'
                                && req.query.customer.membershipNumber.length > 0)
                                ? req.query.customer.membershipNumber
                                : undefined
                        }
                    },
                    ids: (typeof req.query.customer?.id === 'string' && req.query.customer.id.length > 0)
                        ? [req.query.customer.id]
                        : (typeof req.query.customerId === 'string' && req.query.customerId.length > 0)
                            ? [req.query.customerId]
                            : undefined,
                    familyName: (typeof req.query.customer?.familyName === 'string' && req.query.customer.familyName.length > 0)
                        ? { $regex: req.query.customer.familyName }
                        : undefined,
                    givenName: (typeof req.query.customer?.givenName === 'string' && req.query.customer.givenName.length > 0)
                        ? { $regex: req.query.customer.givenName }
                        : undefined,
                    email: (typeof req.query.customer?.email === 'string' && req.query.customer.email.length > 0)
                        ? { $regex: req.query.customer.email }
                        : undefined,
                    telephone: (typeof req.query.customer?.telephone === 'string' && req.query.customer.telephone.length > 0)
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
                            $in: (typeof req.query.itemOffered?.typeOf === 'string' && req.query.itemOffered.typeOf.length > 0)
                                ? [req.query.itemOffered.typeOf]
                                : undefined
                        },
                        identifier: {
                            $in: (typeof req.query.itemOffered?.identifier === 'string' && req.query.itemOffered.identifier.length > 0)
                                ? [req.query.itemOffered.identifier]
                                : undefined
                        },
                        issuedThrough: {
                            id: {
                                $in: (typeof req.query.itemOffered?.issuedThrough?.id === 'string'
                                    && req.query.itemOffered.issuedThrough.id.length > 0)
                                    ? [req.query.itemOffered.issuedThrough.id]
                                    : undefined
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
                        ids: (typeof req.query.itemOffered?.id === 'string' && req.query.itemOffered.id.length > 0)
                            ? [req.query.itemOffered.id]
                            : undefined,
                        reservationNumbers: (typeof req.query.reservationNumber === 'string' && req.query.reservationNumber.length > 0)
                            ? [req.query.reservationNumber]
                            : undefined,
                        reservationFor: {
                            ids: (typeof req.query.reservationFor?.id === 'string' && req.query.reservationFor.id.length > 0)
                                ? [req.query.reservationFor.id]
                                : undefined,
                            name: (typeof req.query.reservationFor?.name === 'string' && req.query.reservationFor.name.length > 0)
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
                                ids: (typeof req.query.reservationFor?.superEvent?.id === 'string'
                                    && req.query.reservationFor.superEvent.id.length > 0)
                                    ? [req.query.reservationFor.superEvent.id]
                                    : undefined,
                                workPerformed: {
                                    identifiers: (typeof req.query.reservationFor?.workPerformed?.identifier === 'string'
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
                    accountIds: (typeof req.query.paymentMethod?.accountId === 'string' && req.query.paymentMethod.accountId.length > 0)
                        ? [req.query.paymentMethod.accountId]
                        : undefined,
                    paymentMethodIds: (typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                        ? [req.query.paymentMethodId]
                        : undefined
                },
                price: {
                    $gte: (typeof req.query.price?.$gte === 'string' && req.query.price.$gte.length > 0)
                        ? Number(req.query.price.$gte)
                        : undefined,
                    $lte: (typeof req.query.price?.$lte === 'string' && req.query.price.$lte.length > 0)
                        ? Number(req.query.price.$lte)
                        : undefined
                },
                broker: {
                    id: {
                        $eq: (typeof req.query.broker?.id === 'string' && req.query.broker?.id.length > 0)
                            ? req.query.broker?.id
                            : undefined
                    }
                }
            };
            const { data } = await orderService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((order) => {
                    let clientId: string | undefined;
                    if (Array.isArray(order.customer?.identifier)) {
                        clientId = order.customer?.identifier.find((i) => i.name === 'clientId')?.value;
                    }
                    const application = applications.find((a) => a.id === clientId);

                    const numItems = (Array.isArray(order.acceptedOffers)) ? order.acceptedOffers.length : 0;
                    const numPaymentMethods = (Array.isArray(order.paymentMethods)) ? order.paymentMethods.length : 0;
                    const numIdentifiers = (Array.isArray(order.identifier)) ? order.identifier.length : 0;

                    let itemType: string[] = [];
                    let itemTypeStr: string = '';
                    if (Array.isArray(order.acceptedOffers) && order.acceptedOffers.length > 0) {
                        itemTypeStr = order.acceptedOffers[0].itemOffered.typeOf;
                        itemTypeStr += ` x ${order.acceptedOffers.length}`;
                        itemType = order.acceptedOffers.map((o) => o.itemOffered.typeOf);
                    }

                    let paymentMethodTypeStr: string = '';
                    if (Array.isArray(order.paymentMethods) && order.paymentMethods.length > 0) {
                        paymentMethodTypeStr = order.paymentMethods.map((p) => p.typeOf)
                            .join(',');
                    }

                    return {
                        ...order,
                        application: application,
                        numItems,
                        numPaymentMethods,
                        numIdentifiers,
                        itemType,
                        itemTypeStr,
                        paymentMethodTypeStr
                    };
                })
            });
        } catch (err) {
            res.json({
                message: err.message,
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

ordersRouter.get(
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

ordersRouter.get(
    '/:orderNumber/actions',
    async (req, res) => {
        try {
            const orderService = new chevre.service.Order({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const actions = await orderService.searchActionsByOrderNumber({
                orderNumber: req.params.orderNumber,
                sort: { startDate: chevre.factory.sortType.Ascending }
            });

            res.json(actions.map((a) => {
                return {
                    ...a,
                    timeline: TimelineFactory.createFromAction({
                        project: { id: req.project.id },
                        action: a
                    })
                };
            }));
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

/**
 * 注文詳細
 */
ordersRouter.get(
    '/:orderNumber',
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const orderService = new chevre.service.Order({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const order = await orderService.findByOrderNumber({
                orderNumber: req.params.orderNumber
            });

            let actionsOnOrder: any[] = [];
            let timelines: TimelineFactory.ITimeline[] = [];
            try {
                actionsOnOrder = await orderService.searchActionsByOrderNumber({
                    orderNumber: order.orderNumber,
                    sort: { startDate: chevre.factory.sortType.Ascending }
                });

                timelines = actionsOnOrder.map((a) => {
                    return TimelineFactory.createFromAction({
                        project: req.project,
                        action: a
                    });
                });
            } catch (error) {
                // no op
            }

            res.render('orders/details', {
                moment: moment,
                order: order,
                timelines: timelines,
                ActionStatusType: chevre.factory.actionStatusType
            });
        } catch (error) {
            next(error);
        }
    }
);

export default ordersRouter;
