/**
 * トリップルーター
 */
import { chevre } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../factory/reservedCodeValues';
import * as Message from '../message';

import { validateCsrfToken } from '..//middlewares/validateCsrfToken';

const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_NAME: number = 64;

const tripsRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
tripsRouter.all<ParamsDictionary>(
    '/add',
    validateCsrfToken,
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        const tripService = new chevre.service.Trip({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        let message = '';
        let errors: any = {};
        let csrfToken: string | undefined;

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    const attributesList: chevre.factory.trip.busTrip.ITrip[] = [
                        createFromBody(req, true)
                    ];
                    const trips = await tripService.create(attributesList);
                    // tslint:disable-next-line:no-dynamic-delete
                    delete (<Express.Session>req.session).csrfSecret;
                    req.flash('message', `${trips.length}つのトリップを登録しました`);
                    const redirect = `/projects/${req.project.id}/trips/${trips[0].id}/update`;
                    res.redirect(redirect);

                    return;
                } catch (error) {
                    console.error(error);
                    message = error.message;
                }
            } else {
                message = '入力に誤りがあります';
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
        }

        res.render('trips/add', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

tripsRouter.get(
    '',
    async (__, res) => {
        res.render('trips/index', {
        });
    }
);

tripsRouter.get(
    '/getlist',
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        try {
            const tripService = new chevre.service.Trip({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
            const { data } = await tripService.search<chevre.factory.tripType.BusTrip>({
                limit: limit,
                page: page,
                sort: {
                    identifier: (req.query.sortType === String(chevre.factory.sortType.Descending))
                        ? chevre.factory.sortType.Descending
                        : chevre.factory.sortType.Ascending
                },
                project: { id: { $eq: req.project.id } },
                identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                    ? { $eq: req.query.identifier }
                    : undefined,
                name: (typeof req.query.name === 'string' && req.query.name.length > 0)
                    ? { $regex: req.query.name }
                    : undefined,
                typeOf: chevre.factory.tripType.BusTrip,
                additionalProperty: {
                    ...(typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                        ? { $elemMatch: { name: { $eq: additionalPropertyElemMatchNameEq } } }
                        : undefined
                }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((trip) => {
                    // const additionalPropertyMatched =
                    //     (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                    //         ? event.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                    //         : undefined;

                    return {
                        ...trip
                        // ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
                    };
                })
            });
        } catch (error) {
            res.json({
                success: false,
                count: 0,
                results: error
            });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
tripsRouter.all<ParamsDictionary>(
    '/:tripId/update',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const tripService = new chevre.service.Trip({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let message = '';
            let errors: any = {};
            const tripId = req.params.tripId;

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        const attributes = createFromBody(req, false);
                        await tripService.update({
                            id: tripId,
                            attributes: attributes
                        });
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                } else {
                    message = '入力に誤りがあります';
                }
            }

            const trip = await tripService.findById<chevre.factory.tripType.BusTrip>({ id: tripId });

            const forms = {
                additionalProperty: [],
                ...trip,
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

            res.render('trips/edit', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

tripsRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const tripService = new chevre.service.Trip({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // validation
            const trip = await tripService.findById<chevre.factory.tripType.BusTrip>({ id: req.params.id });
            await preDelete(req, trip);

            await tripService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(__: Request, __2: chevre.factory.trip.busTrip.ITrip) {
    // validation
    // const tripService = new chevre.service.Trip({
    //     endpoint: <string>process.env.API_ENDPOINT,
    //     auth: req.user.authClient,
    //     project: { id: req.project.id }
    // });
    // const searchEventsResult = await tripService.search<chevre.factory.eventType.ScreeningEvent>({
    //     limit: 1,
    //     project: { id: { $eq: req.project.id } },
    //     typeOf: chevre.factory.eventType.ScreeningEvent,
    //     superEvent: { ids: [eventSeries.id] }
    // });
    // if (searchEventsResult.data.length > 0) {
    //     throw new Error('関連するスケジュールが存在します');
    // }
}

tripsRouter.get(
    '/:tripId/events',
    async (__, res) => {
        try {
            res.json({
                data: [],
                // 使用する側ではスケジュールが存在するかどうかが知れれば十分
                totalCount: 0
            });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({ error: { message: error.message } });
        }
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createFromBody(
    req: Request,
    isNew: boolean
): chevre.factory.trip.busTrip.ITrip & chevre.service.IUnset {
    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.tripType.BusTrip,
        name: {
            ja: req.body.name?.ja,
            ...(typeof req.body.name?.en === 'string' && req.body.name.en.length > 0) ? { en: req.body.name.en } : undefined
        },
        arrivalBusStop: {
            typeOf: chevre.factory.placeType.BusStop,
            name: { ja: 'SampleArrivalBusStop' },
            branchCode: '001'
        },
        departureBusStop: {
            typeOf: chevre.factory.placeType.BusStop,
            name: { ja: 'SampleDepartureBusStop' },
            branchCode: '001'
        },
        identifier: String(req.body.identifier),
        // additionalProperty: (Array.isArray(req.body.additionalProperty))
        //     ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
        //         .map((p: any) => {
        //             return {
        //                 name: String(p.name),
        //                 value: String(p.value)
        //             };
        //         })
        //     : undefined,
        ...(!isNew)
            ? {
                // $unset: {
                // }
            }
            : undefined
    };
}

function validate() {
    return [
        body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 32 })
            .withMessage('3~32文字で入力してください')
            // 予約語除外
            .not()
            .isIn(RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        body('name.en')
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        body([
            'additionalProperty.*.name'
            // 'additionalProperty.*.value'
        ])
            .optional()
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .if((value: any) => String(value).length > 0)
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}

export { tripsRouter };
