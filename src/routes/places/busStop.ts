/**
 * ターミナルルーター
 */
import { chevre } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../../factory/reservedCodeValues';
import * as Message from '../../message';

import { validateCsrfToken } from '../../middlewares/validateCsrfToken';

const debug = createDebug('chevre-console:router');

const NUM_ADDITIONAL_PROPERTY: number = 10;

const busStopRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
busStopRouter.all<ParamsDictionary>(
    '/new',
    validateCsrfToken,
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};
        let csrfToken: string | undefined;

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    debug(req.body);
                    req.body.id = '';
                    let busStop = await createFromBody(req, true);
                    const placeService = new chevre.service.Place({
                        endpoint: <string>process.env.API_ENDPOINT,
                        auth: req.user.authClient,
                        project: { id: req.project.id }
                    });

                    busStop = await placeService.createBusStop(busStop);

                    // tslint:disable-next-line:no-dynamic-delete
                    delete (<Express.Session>req.session).csrfSecret;
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/places/busStop/${busStop.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        } else {
            const tokens = new Tokens();
            const csrfSecret = await tokens.secret();
            csrfToken = tokens.create(csrfSecret);
            (<Express.Session>req.session).csrfSecret = {
                value: csrfSecret,
                createDate: new Date()
            };
        }

        const forms = {
            additionalProperty: [],
            name: {},
            ...(typeof csrfToken === 'string') ? { csrfToken } : undefined,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // no op
        } else {
            // no op
        }

        res.render('places/busStop/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

busStopRouter.get(
    '',
    (_, res) => {
        res.render('places/busStop/index', {
            message: ''
        });
    }
);

busStopRouter.get(
    '/search',
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const branchCodeRegex = req.query.branchCode?.$regex;
            const nameRegex = req.query.name;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            // const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
            const { data } = await placeService.searchBusStops({
                limit: limit,
                page: page,
                sort: { branchCode: chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                branchCode: {
                    $regex: (typeof branchCodeRegex === 'string' && branchCodeRegex.length > 0)
                        ? branchCodeRegex
                        : undefined
                },
                name: (typeof nameRegex === 'string' && nameRegex.length > 0)
                    ? { $regex: nameRegex }
                    : undefined
            });

            const results = data.map((busStop) => {
                // const additionalPropertyMatched =
                //     (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                //         ? movieTheater.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                //         : undefined;

                return {
                    ...busStop
                    // ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
                };
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: results
            });
        } catch (err) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

busStopRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchBusStopsResult = await placeService.searchBusStops({
                limit: 1,
                id: { $eq: req.params.id }
            });
            const busStop = searchBusStopsResult.data.shift();
            if (busStop === undefined) {
                throw new Error('ターミナルが見つかりません');
            }
            await preDelete(req, busStop);

            await placeService.deleteBusStop({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(__: Request, __2: chevre.factory.place.busStop.IPlace) {
    // トリップが存在するかどうか
    // const eventService = new chevre.service.Event({
    //     endpoint: <string>process.env.API_ENDPOINT,
    //     auth: req.user.authClient,
    //     project: { id: req.project.id }
    // });

    // const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
    //     limit: 1,
    //     project: { id: { $eq: req.project.id } },
    //     typeOf: chevre.factory.eventType.ScreeningEventSeries,
    //     location: { branchCode: { $eq: busStop.branchCode } }
    // });
    // if (searchEventsResult.data.length > 0) {
    //     throw new Error('関連する施設コンテンツが存在します');
    // }
}

// tslint:disable-next-line:use-default-type-parameter
busStopRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        const searchBusStopsResult = await placeService.searchBusStops({ limit: 1, id: { $eq: req.params.id } });
        let busStop = searchBusStopsResult.data.shift();
        if (busStop === undefined) {
            throw new Error('ターミナルが見つかりません');
        }

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    busStop = await createFromBody(req, false);
                    debug('saving an busStop...', busStop);
                    await placeService.updateBusStop(busStop);

                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            ...busStop,
            ...req.body
        };

        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // no op
        } else {
            // no op
        }

        res.render('places/busStop/update', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

// tslint:disable-next-line:max-func-body-length
async function createFromBody(
    req: Request, isNew: boolean
): Promise<chevre.factory.place.busStop.IPlace & chevre.service.IUnset> {
    // tslint:disable-next-line:no-unnecessary-local-variable
    const busStop: chevre.factory.place.busStop.IPlace = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        id: req.body.id,
        typeOf: chevre.factory.placeType.BusStop,
        branchCode: req.body.branchCode,
        name: req.body.name,
        // additionalProperty: (Array.isArray(req.body.additionalProperty))
        //     ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name.length > 0)
        //         .map((p: any) => {
        //             return {
        //                 name: String(p.name),
        //                 value: String(p.value)
        //             };
        //         })
        //     : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    // ...(url === undefined) ? { url: 1 } : undefined
                }
            }
            : undefined
    };

    return busStop;
}

// tslint:disable-next-line:max-func-body-length
function validate() {
    return [
        body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 12 })
            .withMessage('3~12文字で入力してください')
            // 予約語除外
            .not()
            .isIn(RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        body('additionalProperty.*.name')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}

export { busStopRouter };
