/**
 * 所有権ルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment';

import { productTypes } from '../factory/productType';
import * as TimelineFactory from '../factory/timeline';

const AUTHORIZATION_EXPIRES_IN_SECONDS = 600;

const ownershipInfosRouter = Router();

ownershipInfosRouter.get(
    '',
    async (__, res) => {
        res.render('ownershipInfos/index', {
            message: '',
            productTypes: productTypes
        });
    }
);

ownershipInfosRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res) => {
        try {
            const ownershipInfoService = new chevre.service.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: chevre.factory.ownershipInfo.ISearchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                project: { id: { $eq: req.project.id } },
                ids: (typeof req.query.id?.$eq === 'string' && req.query.id.$eq.length > 0)
                    ? [req.query.id.$eq]
                    : undefined,
                ownedFrom: (typeof req.query.ownedFrom === 'string' && req.query.ownedFrom.length > 0)
                    ? moment(`${String(req.query.ownedFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                ownedThrough: (typeof req.query.ownedThrough === 'string' && req.query.ownedThrough.length > 0)
                    ? moment(`${String(req.query.ownedThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                    : undefined,
                ownedBy: {
                    id: (typeof req.query.ownedBy?.id === 'string' && req.query.ownedBy.id.length > 0)
                        ? req.query.ownedBy.id
                        : undefined
                },
                typeOfGood: {
                    typeOf: (typeof req.query.typeOfGood?.typeOf === 'string' && req.query.typeOfGood.typeOf.length > 0)
                        ? { $eq: req.query.typeOfGood.typeOf }
                        : undefined,
                    id: (typeof req.query.typeOfGood?.id === 'string' && req.query.typeOfGood.id.length > 0)
                        ? { $eq: req.query.typeOfGood.id }
                        : undefined,
                    identifier: (typeof req.query.typeOfGood?.identifier === 'string' && req.query.typeOfGood.identifier.length > 0)
                        ? { $eq: req.query.typeOfGood.identifier }
                        : undefined,
                    issuedThrough: {
                        id: (typeof req.query.typeOfGood?.issuedThrough?.id === 'string'
                            && req.query.typeOfGood.issuedThrough.id.length > 0)
                            ? { $eq: req.query.typeOfGood.issuedThrough.id }
                            : undefined,
                        typeOf: (typeof req.query.typeOfGood?.issuedThrough?.typeOf === 'string'
                            && req.query.typeOfGood.issuedThrough.typeOf.length > 0)
                            ? { $eq: req.query.typeOfGood.issuedThrough.typeOf }
                            : undefined
                    }
                }
            };
            const { data } = await ownershipInfoService.search({
                ...searchConditions,
                includeGoodWithDetails: (req.query.includeGoodWithDetails === '1') ? '1' : undefined
            });

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((ownershipInfo) => {
                    return {
                        ...ownershipInfo,
                        // ownedByのArray対応
                        ownedByCount: (Array.isArray(ownershipInfo.ownedBy))
                            ? ownershipInfo.ownedBy.length
                            : 1
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

ownershipInfosRouter.get(
    '/:id/actions',
    async (req, res, next) => {
        try {
            const actionService = new chevre.service.Action({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const ownershipInfoService = new chevre.service.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchOwnershipInfosResult = await ownershipInfoService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                ids: [req.params.id]
            });
            const ownershipInfo = searchOwnershipInfosResult.data.shift();
            if (ownershipInfo === undefined) {
                throw new chevre.factory.errors.NotFound('OwnershipInfo');
            }

            // アクション
            const actionsOnOwnershipInfos: chevre.factory.action.IAction<chevre.factory.action.IAttributes<any, any, any>>[] = [];
            const ownedFrom = moment(ownershipInfo.ownedFrom)
                .toDate();

            try {
                // resultが所有権
                const searchSendActionsResult = await actionService.search({
                    limit: 100,
                    sort: { startDate: chevre.factory.sortType.Ascending },
                    startFrom: ownedFrom,
                    // typeOf: cinerinoapi.factory.actionType.CheckAction,
                    // typeOf: cinerinoapi.factory.actionType.ReturnAction,
                    // typeOf: cinerinoapi.factory.actionType.SendAction,
                    result: {
                        typeOf: { $in: [ownershipInfo.typeOf] },
                        id: { $in: [ownershipInfo.id] }
                    }
                });
                actionsOnOwnershipInfos.push(...searchSendActionsResult.data);

                // objectが所有権
                const searchAuthorizeActionsResult = await actionService.search({
                    limit: 100,
                    sort: { startDate: chevre.factory.sortType.Ascending },
                    startFrom: ownedFrom,
                    // typeOf: cinerinoapi.factory.actionType.AuthorizeAction,
                    object: {
                        typeOf: { $in: [ownershipInfo.typeOf] },
                        id: { $in: [ownershipInfo.id] }
                    }
                });
                actionsOnOwnershipInfos.push(...searchAuthorizeActionsResult.data);
            } catch (error) {
                // no op
            }

            res.json(actionsOnOwnershipInfos.map((a) => {
                return {
                    ...a,
                    timeline: TimelineFactory.createFromAction({
                        project: { id: req.project.id },
                        action: a
                    })
                };
            }));
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 所有権コード発行
 */
ownershipInfosRouter.get(
    '/:id/authorize',
    async (req, res) => {
        try {
            const authorizationService = new chevre.service.Authorization({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const ownershipInfoService = new chevre.service.OwnershipInfo({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchOwnershipInfosResult = await ownershipInfoService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                ids: [req.params.id]
            });
            const ownershipInfo = searchOwnershipInfosResult.data.shift();
            if (ownershipInfo === undefined) {
                throw new chevre.factory.errors.NotFound('OwnershipInfo');
            }

            const authorizations = await authorizationService.create([{
                project: ownershipInfo.project,
                typeOf: 'Authorization',
                code: 'xxx',
                object: ownershipInfo,
                validFrom: new Date(),
                expiresInSeconds: AUTHORIZATION_EXPIRES_IN_SECONDS
            }]);
            const authorization = authorizations.shift();
            if (authorization === undefined) {
                throw new Error('authorization undefined');
            }
            const code = authorization.code;

            res.json({ code });
        } catch (error) {
            res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                .json({ message: error.message });
        }
    }
);

export { ownershipInfosRouter };
