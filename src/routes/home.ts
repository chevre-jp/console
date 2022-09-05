/**
 * プロジェクトホームルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

import * as TimelineFactory from '../factory/timeline';

const homeRouter = Router();

homeRouter.get(
    '/',
    async (req, res, next) => {
        try {
            if (req.query.next !== undefined) {
                next(new Error(req.param('next')));

                return;
            }

            const roleNames = await searchRoleNames(req);

            res.render(
                'home',
                { roleNames }
            );
        } catch (error) {
            next(error);
        }
    }
);

homeRouter.get(
    '/analysis',
    async (req, res, next) => {
        try {
            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let applications: any[] = [];
            let sellers: chevre.factory.seller.ISeller[] = [];
            let paymentMethodTypes: chevre.factory.categoryCode.ICategoryCode[] = [];

            try {
                // IAMメンバー検索(アプリケーション)
                const searchMembersResult = await iamService.searchMembers({
                    member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
                });
                applications = searchMembersResult.data.map((m) => m.member);
            } catch (error) {
                // no op
            }

            try {
                const searchSellersResult = await sellerService.search({});
                sellers = searchSellersResult.data;
            } catch (error) {
                // no op
            }

            try {
                const searchPaymentMethodTypesResult = await categoryCodeService.search({
                    inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType } }
                });
                paymentMethodTypes = searchPaymentMethodTypesResult.data;
            } catch (error) {
                // no op
            }

            res.render('analysis', {
                message: 'Welcome to Smart Theater Console!',
                applications: applications,
                paymentMethodTypes,
                sellers,
                moment: moment,
                timelines: []
            });
        } catch (error) {
            next(error);
        }
    }
);

async function searchRoleNames(req: Request): Promise<string[]> {
    let roleNames: string[] = [];

    try {
        // 自分のロールを確認
        const iamService = new chevre.service.IAM({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project?.id }
        });
        const member = await iamService.findMemberById({ member: { id: 'me' } });
        roleNames = member.member.hasRole
            .map((r) => r.roleName);
    } catch (error) {
        console.error(
            'searchRoleNames throwed an error.',
            'accessToken:', req.user?.authClient?.credentials?.accessToken,
            'sub: ', req.user?.profile?.sub,
            'message: ', error.message, 'code: ', error.code
        );
    }

    return roleNames;
}

homeRouter.get(
    '/dbStats',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const stats = await eventService.fetch({
                uri: '/stats/dbStats',
                method: 'GET',
                // tslint:disable-next-line:no-magic-numbers
                expectedStatusCodes: [200]
            })
                .then(async (response) => {
                    return response.json();
                });

            res.json(stats);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/health',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const stats = await eventService.fetch({
                uri: '/health',
                method: 'GET',
                // tslint:disable-next-line:no-magic-numbers
                expectedStatusCodes: [200]
            })
                .then(async (response) => {
                    const version = response.headers.get('X-API-Version');

                    return {
                        version: version,
                        status: await response.text()
                    };
                });

            res.json(stats);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/queueCount',
    async (req, res) => {
        try {
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const result = await taskService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                runsFrom: moment()
                    .add(-1, 'day')
                    .toDate(),
                runsThrough: moment()
                    .toDate(),
                statuses: [chevre.factory.taskStatus.Ready]
            });

            res.json(result);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/latestReservations',
    async (req, res) => {
        try {
            const reservationService = new chevre.service.Reservation({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const result = await reservationService.search({
                limit: 10,
                page: 1,
                // project: { id: { $eq: req.project.id } },
                typeOf: chevre.factory.reservationType.EventReservation,
                reservationStatus: {
                    $eq: chevre.factory.reservationStatusType.ReservationConfirmed
                },
                // reservationStatuses: [
                //     chevre.factory.reservationStatusType.ReservationConfirmed,
                //     chevre.factory.reservationStatusType.ReservationPending
                // ],
                bookingFrom: moment()
                    .add(-1, 'day')
                    .toDate(),
                $projection: {
                    broker: 0,
                    price: 0,
                    reservedTicket: 0,
                    subReservation: 0,
                    underName: 0
                }
            });

            res.json(result);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/latestOrders',
    async (req, res) => {
        try {
            const orderService = new chevre.service.Order({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const result = await orderService.search({
                limit: 10,
                page: 1,
                sort: { orderDate: chevre.factory.sortType.Descending },
                // project: { id: { $eq: req.project.id } },
                orderDate: {
                    $gte: moment()
                        .add(-1, 'day')
                        .toDate()
                },
                $projection: {
                    acceptedOffers: 0,
                    broker: 0,
                    customer: 0,
                    orderedItem: 0,
                    paymentMethods: 0,
                    seller: 0
                }
            });

            res.json(result);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/eventsWithAggregations',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const result = await eventService.search({
                typeOf: chevre.factory.eventType.ScreeningEvent,
                limit: 10,
                page: 1,
                eventStatuses: [chevre.factory.eventStatusType.EventScheduled],
                sort: { startDate: chevre.factory.sortType.Ascending },
                // project: { id: { $eq: req.project.id } },
                inSessionFrom: moment()
                    .toDate(),
                inSessionThrough: moment()
                    .tz('Asia/Tokyo')
                    .endOf('day')
                    .toDate()
            });

            res.json(result);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/errorReporting',
    async (req, res) => {
        try {
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const runsThrough = moment()
                .toDate();
            const result = await taskService.search({
                limit: 10,
                page: 1,
                project: { id: { $eq: req.project.id } },
                statuses: [chevre.factory.taskStatus.Aborted],
                runsFrom: moment(runsThrough)
                    .add(-1, 'day')
                    .toDate(),
                runsThrough: runsThrough
            });

            res.json(result);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

homeRouter.get(
    '/timelines',
    async (req, res) => {
        try {
            const timelines: TimelineFactory.ITimeline[] = [];
            const actionService = new chevre.service.Action({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project?.id }
            });

            const searchActionsResult = await actionService.search({
                limit: Number(req.query.limit),
                page: Number(req.query.page),
                sort: { startDate: chevre.factory.sortType.Descending },
                startFrom: moment(req.query.startFrom)
                    .toDate(),
                startThrough: moment(req.query.startThrough)
                    .toDate()
            });
            timelines.push(...searchActionsResult.data.map((a) => {
                return TimelineFactory.createFromAction({
                    project: req.project,
                    action: a
                });
            }));

            res.json(timelines);
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

export { homeRouter };
