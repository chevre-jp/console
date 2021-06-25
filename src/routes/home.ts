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
            // const userPoolService = new cinerinoapi.service.UserPool({
            //     endpoint: req.project.settings.API_ENDPOINT,
            //     auth: req.user.authClient,
            //     project: { id: req.project.id }
            // });
            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            // const projectService = new cinerinoapi.service.Project({
            //     endpoint: req.project.settings.API_ENDPOINT,
            //     auth: req.user.authClient
            // });
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // const project = await projectService.findById({ id: req.project.id });

            // let userPool: cinerinoapi.factory.cognito.UserPoolType | undefined;
            // let adminUserPool: cinerinoapi.factory.cognito.UserPoolType | undefined;
            let applications: any[] = [];
            let sellers: chevre.factory.seller.ISeller[] = [];
            let paymentMethodTypes: chevre.factory.chevre.categoryCode.ICategoryCode[] = [];

            // try {
            //     if (project.settings !== undefined && project.settings.cognito !== undefined) {
            //         userPool = await userPoolService.findById({
            //             userPoolId: project.settings.cognito.customerUserPool.id
            //         });

            //         adminUserPool = await userPoolService.findById({
            //             userPoolId: (<any>project).settings.cognito.adminUserPool.id
            //         });
            //     }
            // } catch (error) {
            //     // no op
            // }

            try {
                // IAMメンバー検索(アプリケーション)
                const searchMembersResult = await iamService.searchMembers({
                    member: { typeOf: { $eq: chevre.factory.chevre.creativeWorkType.WebApplication } }
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
                    inCodeSet: { identifier: { $eq: chevre.factory.chevre.categoryCode.CategorySetIdentifier.PaymentMethodType } }
                });
                paymentMethodTypes = searchPaymentMethodTypesResult.data;
            } catch (error) {
                // no op
            }

            res.render('analysis', {
                message: 'Welcome to Chevre Console!',
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
        // const searchMembersResult = await iamService.searchMembers({
        //     limit: 1,
        //     member: {
        //         typeOf: { $eq: chevreapi.factory.personType.Person },
        //         id: { $eq: req.user.profile.sub }
        //     }
        // });
        roleNames = member.member.hasRole
            .map((r) => r.roleName);
        // if (!Array.isArray(roleNames)) {
        //     roleNames = [];
        // }
    } catch (error) {
        console.error(error);
    }

    return roleNames;
}

homeRouter.get(
    '/projectAggregation',
    async (req, res) => {
        try {
            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            const project = await projectService.findById({ id: req.project.id });

            res.json(project);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
        }
    }
);

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
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
                project: { id: { $eq: req.project.id } },
                typeOf: chevre.factory.reservationType.EventReservation,
                reservationStatuses: [
                    chevre.factory.reservationStatusType.ReservationConfirmed,
                    chevre.factory.reservationStatusType.ReservationPending
                ],
                bookingFrom: moment()
                    .add(-1, 'day')
                    .toDate()
            });

            res.json(result);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
                project: { id: { $eq: req.project.id } },
                orderDate: {
                    $gte: moment()
                        .add(-1, 'day')
                        .toDate()
                }
            });

            res.json(result);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
                project: { id: { $eq: req.project.id } },
                inSessionFrom: moment()
                    .add()
                    .toDate(),
                inSessionThrough: moment()
                    .tz('Asia/Tokyo')
                    .endOf('day')
                    .toDate(),
                ...{
                    countDocuments: '1'
                }
            });

            res.json(result);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
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
                project: { id: { $eq: req.project.id } },
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
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    error: { message: error.message }
                });
        }
    }
);

export default homeRouter;
