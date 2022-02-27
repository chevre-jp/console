/**
 * 会員ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment';

import * as TimelineFactory from '../factory/timeline';

const CUSTOMER_USER_POOL_ID = String(process.env.CUSTOMER_USER_POOL_ID);
const CUSTOMER_USER_POOL_ID_NEW = String(process.env.CUSTOMER_USER_POOL_ID_NEW);

const peopleRouter = express.Router();

/**
 * 会員検索
 */
peopleRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res, next) => {
        try {
            const personService = new chevre.service.Person({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchConditions = {
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID,
                // limit: req.query.limit,
                // page: req.query.page,
                id: (req.query.id !== undefined && req.query.id !== '') ? req.query.id : undefined,
                username: (req.query.username !== undefined && req.query.username !== '') ? req.query.username : undefined,
                email: (req.query.email !== undefined && req.query.email !== '') ? req.query.email : undefined,
                telephone: (req.query.telephone !== undefined && req.query.telephone !== '') ? req.query.telephone : undefined,
                familyName: (req.query.familyName !== undefined && req.query.familyName !== '') ? req.query.familyName : undefined,
                givenName: (req.query.givenName !== undefined && req.query.givenName !== '') ? req.query.givenName : undefined
            };
            if (req.query.format === 'datatable') {
                const searchResult = await personService.search(searchConditions);

                res.json({
                    success: true,
                    count: searchResult.data.length,
                    results: searchResult.data
                });
            } else {
                res.render('people/index', {
                    moment: moment,
                    searchConditions: searchConditions,
                    iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                        ? req.query.iss
                        : CUSTOMER_USER_POOL_ID
                });
            }
        } catch (error) {
            if (req.query.format === 'datatable') {
                res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                    .json({ message: error.message });
            } else {
                next(error);
            }
        }
    }
);

/**
 * 会員編集
 */
peopleRouter.all(
    '/:id',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            let message = '';

            const personService = new chevre.service.Person({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const person = await personService.findById({
                id: req.params.id,
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID
            });

            if (req.method === 'DELETE') {
                const physically = req.body.physically === 'on';
                await personService.deleteById({
                    id: person.id,
                    physically: physically,
                    iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                        ? req.query.iss
                        : CUSTOMER_USER_POOL_ID
                });

                res.status(NO_CONTENT)
                    .end();

                return;
            } else if (req.method === 'POST') {
                try {
                    // 管理者としてプロフィール更新の場合、メールアドレスを認証済にセット
                    const additionalProperty = (Array.isArray(req.body.additionalProperty))
                        ? <chevre.factory.person.IAdditionalProperty>req.body.additionalProperty
                        : [];
                    additionalProperty.push({
                        name: 'email_verified',
                        value: 'true'
                    });
                    const profile = {
                        ...(typeof req.body.familyName === 'string') ? { familyName: req.body.familyName } : {},
                        ...(typeof req.body.givenName === 'string') ? { givenName: req.body.givenName } : {},
                        ...(typeof req.body.telephone === 'string') ? { telephone: req.body.telephone } : {},
                        ...(typeof req.body.email === 'string') ? { email: req.body.email } : {},
                        additionalProperty: additionalProperty
                    };

                    await personService.updateProfile({
                        id: req.params.id,
                        ...profile,
                        iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                            ? req.query.iss
                            : CUSTOMER_USER_POOL_ID
                    });

                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }

            res.render('people/details', {
                message: message,
                moment: moment,
                person: person,
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * タイムライン
 */
peopleRouter.get(
    '/:id/timelines',
    async (req, res, next) => {
        try {
            const personService = new chevre.service.Person({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const person = await personService.findById({
                id: req.params.id,
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID
            });

            const timelines: TimelineFactory.ITimeline[] = [
                {
                    action: {
                        typeOf: chevre.factory.actionType.CreateAction
                    },
                    agent: {
                        id: person.id,
                        name: `${person.givenName} ${person.familyName}`,
                        url: req.originalUrl
                    },
                    actionName: '作成',
                    object: {
                        name: `${person.givenName} ${person.familyName}`,
                        url: req.originalUrl
                    },
                    startDate: moment((<any>person).UserCreateDate)
                        .toDate(),
                    actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                    actionStatusDescription: 'しました',
                    result: {}
                }
            ];
            if ((<any>person).Enabled === false
                && (<any>person).UserStatus === 'CONFIRMED'
                && typeof (<any>person).UserLastModifiedDate === 'string' && (<any>person).UserLastModifiedDate.length > 0) {
                timelines.push({
                    action: {
                        typeOf: chevre.factory.actionType.DeleteAction
                    },
                    agent: {
                        id: person.id,
                        name: `${person.givenName} ${person.familyName}`,
                        url: req.originalUrl
                    },
                    actionName: '削除',
                    object: {
                        name: `${person.givenName} ${person.familyName}`,
                        url: req.originalUrl
                    },
                    startDate: moment((<any>person).UserLastModifiedDate)
                        .toDate(),
                    actionStatus: chevre.factory.actionStatusType.CompletedActionStatus,
                    actionStatusDescription: 'しました',
                    result: {}
                });
            }

            res.json(timelines.sort(
                (a, b) => (moment(a.startDate)
                    .isAfter(moment(b.startDate))) ? -1 : 1));
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員注文検索
 */
peopleRouter.get(
    '/:id/orders',
    async (req, res, next) => {
        try {
            const now = new Date();

            const orderService = new chevre.service.Order({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchOrdersResult = await orderService.search({
                limit: req.query.limit,
                page: req.query.page,
                sort: { orderDate: chevre.factory.sortType.Descending },
                orderDateFrom: moment(now)
                    .add(-1, 'months')
                    .toDate(),
                orderDateThrough: now,
                customer: {
                    ids: [req.params.id]
                }
            });

            res.json(searchOrdersResult);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約検索
 */
peopleRouter.get(
    '/:id/reservations',
    async (req, res, next) => {
        try {
            const now = new Date();

            const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchResult = await personOwnershipInfoService.search({
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID,
                // iss: req.params.iss,
                limit: req.query.limit,
                page: req.query.page,
                id: req.params.id,
                typeOfGood: {
                    issuedThrough: {
                        typeOf: { $eq: chevre.factory.product.ProductType.EventService }
                    }
                },
                ownedFrom: moment(now)
                    .add(-1, 'month')
                    .toDate(),
                ownedThrough: now
            });

            res.json(searchResult);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * メンバーシップ検索
 */
peopleRouter.get(
    '/:id/memberships',
    async (req, res, next) => {
        try {
            const now = new Date();

            const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchResult = await personOwnershipInfoService.search({
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID,
                // iss: req.params.iss,
                limit: req.query.limit,
                page: req.query.page,
                id: req.params.id,
                typeOfGood: {
                    issuedThrough: { typeOf: { $eq: chevre.factory.product.ProductType.MembershipService } }
                },
                ownedFrom: moment(now)
                    .add(-1, 'month')
                    .toDate(),
                ownedThrough: now
            });

            res.json(searchResult);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカード検索
 */
peopleRouter.get(
    '/:id/creditCards',
    async (req, res, next) => {
        try {
            const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const creditCards = await personOwnershipInfoService.searchCreditCards({
                id: req.params.id,
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID
                // iss: req.params.iss
            });

            res.json(creditCards);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 会員所有権検索
 */
peopleRouter.get(
    '/:id/ownershipInfos',
    async (req, res, next) => {
        try {
            const byUsername = req.query.username === '1';
            const message = '';

            const personService = new chevre.service.Person({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let person: chevre.factory.person.IPerson | undefined;
            if (byUsername) {
                const searchPeopleResult = await personService.search({
                    username: `${req.params.id}`,
                    iss: CUSTOMER_USER_POOL_ID_NEW
                });
                person = searchPeopleResult.data.shift();
                // usernameが完全一致である必要
                if (person?.memberOf?.membershipNumber !== req.params.id) {
                    person = undefined;
                }
            } else {
                person = await personService.findById({
                    id: req.params.id,
                    iss: CUSTOMER_USER_POOL_ID_NEW
                });
            }
            if (person === undefined) {
                throw new Error(`会員が見つかりませんでした username:${req.params.id}`);
            }

            const includeExpired = req.query.includeExpired === '1';
            const now = new Date();
            const searchConditions = {
                iss: CUSTOMER_USER_POOL_ID_NEW,
                limit: req.query.limit,
                page: req.query.page,
                id: person.id,
                typeOfGood: { issuedThrough: { typeOf: { $eq: req.query.issuedThrough } } },
                ...(includeExpired)
                    ? undefined
                    : {
                        ownedFrom: now,
                        ownedThrough: now
                    }
            };
            if (req.query.format === 'datatable') {
                const searchResult = await personOwnershipInfoService.search(searchConditions);
                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data.map((r) => {
                        return {
                            ...r,
                            ...(req.query.issuedThrough === chevre.factory.product.ProductType.MembershipService)
                                ? { membershipCode: String(r.typeOfGood.identifier) }
                                : undefined,
                            ...(req.query.issuedThrough === chevre.factory.product.ProductType.PaymentCard)
                                ? { paymentCardCode: String(r.typeOfGood.identifier) }
                                : undefined
                        };
                    })
                });
            } else {
                res.render('people/ownershipInfos/index', {
                    message: message,
                    moment: moment,
                    person: person
                });
            }
        } catch (error) {
            if (req.query.format === 'datatable') {
                res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                    .json({ message: error.message });
            } else {
                next(error);
            }
        }
    }
);

/**
 * クレジットカード削除
 */
// peopleRouter.delete(
//     '/:id/creditCards/:cardSeq',
//     async (req, res, next) => {
//         try {
//             const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
//                 endpoint: <string>process.env.API_ENDPOINT,
//                 auth: req.user.authClient,
//                 project: { id: req.project.id }
//             });
//             await personOwnershipInfoService.deleteCreditCard({
//                 id: req.params.id,
//                 cardSeq: req.params.cardSeq
//             });

//             res.status(NO_CONTENT)
//                 .end();
//         } catch (error) {
//             next(error);
//         }
//     }
// );

peopleRouter.get(
    '/:id/paymentCards',
    async (req, res, next) => {
        try {
            const now = new Date();

            const personOwnershipInfoService = new chevre.service.person.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchOwnershipInfosResult = await personOwnershipInfoService.search({
                iss: (typeof req.query.iss === 'string' && req.query.iss.length > 0)
                    ? req.query.iss
                    : CUSTOMER_USER_POOL_ID,
                // iss: req.params.iss,
                id: req.params.id,
                typeOfGood: {
                    issuedThrough: {
                        typeOf: { $eq: chevre.factory.service.paymentService.PaymentServiceType.PaymentCard }
                    }
                },
                ownedFrom: moment(now)
                    .add(-1, 'month')
                    .toDate(),
                ownedThrough: now
            });

            res.json(searchOwnershipInfosResult.data);
        } catch (error) {
            next(error);
        }
    }
);

export default peopleRouter;
