/**
 * サービスアウトプットルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

import { productTypes } from '../factory/productType';

const permitsRouter = Router();

permitsRouter.get(
    '',
    async (req, res) => {
        const issuedThroughTypeOf = req.query.issuedThrough?.typeOf;
        if (typeof issuedThroughTypeOf !== 'string' || issuedThroughTypeOf.length === 0) {
            res.redirect(`/projects/${req.project.id}/serviceOutputs?issuedThrough[typeOf]=${chevre.factory.product.ProductType.MembershipService}`);

            return;
        }

        res.render('serviceOutputs/index', {
            message: '',
            issuedThroughTypeOf,
            issuedThroughName: productTypes.find((p) => p.codeValue === issuedThroughTypeOf)?.name
        });
    }
);

permitsRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        try {
            const permitService = new chevre.service.Permit({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: chevre.factory.product.IServiceOutputSearchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                typeOf: {
                    ...(typeof req.query?.typeOf?.$eq === 'string')
                        ? { $eq: req.query?.typeOf?.$eq }
                        : undefined
                },
                identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                    ? { $eq: req.query.identifier }
                    : undefined,
                issuedBy: {
                    id: (typeof req.query.issuedBy?.id?.$eq === 'string' && req.query.issuedBy.id.$eq.length > 0)
                        ? { $eq: req.query.issuedBy.id.$eq }
                        : undefined
                },
                issuedThrough: {
                    id: (typeof req.query.issuedThrough?.id?.$eq === 'string' && req.query.issuedThrough.id.$eq.length > 0)
                        ? { $eq: req.query.issuedThrough.id.$eq }
                        : undefined,
                    typeOf: (typeof req.query.issuedThrough?.typeOf?.$eq === 'string' && req.query.issuedThrough.typeOf.$eq.length > 0)
                        ? { $eq: req.query.issuedThrough.typeOf.$eq }
                        : undefined
                }
            };
            const { data } = await permitService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((t) => {
                    return {
                        ...t,
                        issuedThroughName: productTypes.find((p) => p.codeValue === t.issuedThrough?.typeOf)?.name
                    };
                })
            });
        } catch (err) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    count: 0,
                    results: [],
                    error: { message: err.message }
                });
        }
    }
);

export default permitsRouter;
