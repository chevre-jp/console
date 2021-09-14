/**
 * ルームルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../../message';

const debug = createDebug('chevre-backend:router');

const NUM_ADDITIONAL_PROPERTY = 5;

const screeningRoomRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
screeningRoomRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    debug(req.body);
                    req.body.id = '';
                    const screeningRoom = createFromBody(req, true);

                    // const { data } = await placeService.searchScreeningRooms({});
                    // const existingMovieTheater = data.find((d) => d.branchCode === screeningRoom.branchCode);
                    // if (existingMovieTheater !== undefined) {
                    //     throw new Error('コードが重複しています');
                    // }

                    await placeService.createScreeningRoom(screeningRoom);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/places/screeningRoom/${screeningRoom.containedInPlace?.branchCode}:${screeningRoom.branchCode}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            name: {},
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // 施設を補完
            if (typeof req.body.containedInPlace === 'string' && req.body.containedInPlace.length > 0) {
                forms.containedInPlace = JSON.parse(req.body.containedInPlace);
            } else {
                forms.containedInPlace = undefined;
            }
        }

        res.render('places/screeningRoom/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

screeningRoomRouter.get(
    '',
    async (__, res) => {
        res.render('places/screeningRoom/index', {
            message: ''
        });
    }
);

screeningRoomRouter.get(
    '/search',
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await placeService.searchScreeningRooms({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                branchCode: {
                    $regex: (typeof req.query?.branchCode?.$regex === 'string'
                        && req.query?.branchCode?.$regex.length > 0)
                        ? req.query?.branchCode?.$regex
                        : undefined
                },
                containedInPlace: {
                    id: {
                        $eq: (typeof req.query?.containedInPlace?.id?.$eq === 'string'
                            && req.query?.containedInPlace.id.$eq.length > 0)
                            ? req.query?.containedInPlace.id.$eq
                            : undefined

                    },
                    branchCode: {
                        $eq: (typeof req.query?.containedInPlace?.branchCode?.$eq === 'string'
                            && req.query?.containedInPlace?.branchCode?.$eq.length > 0)
                            ? req.query?.containedInPlace?.branchCode?.$eq
                            : undefined
                    }
                },
                name: {
                    $regex: (typeof req.query?.name?.$regex === 'string'
                        && req.query?.name?.$regex.length > 0)
                        ? req.query?.name?.$regex
                        : undefined
                },
                openSeatingAllowed: (req.query.openSeatingAllowed === '1') ? true : undefined,
                ...(req.query.$projection !== undefined && req.query.$projection !== null)
                    ? {
                        $projection: req.query.$projection
                    }
                    : { $projection: { seatCount: 1 } }
            });

            const results = data.map((screeningRoom) => {
                return {
                    ...screeningRoom,
                    openSeatingAllowedStr: (screeningRoom.openSeatingAllowed === true) ? 'done' : undefined
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
                message: err.message,
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
screeningRoomRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const splittedId = req.params.id.split(':');
        const movieTheaterBranchCode = splittedId[0];
        const screeningRoomBranchCode = splittedId[1];

        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        const searchScreeningRoomsResult = await placeService.searchScreeningRooms({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            branchCode: { $eq: screeningRoomBranchCode },
            containedInPlace: {
                branchCode: { $eq: movieTheaterBranchCode }
            }
        });

        let screeningRoom = searchScreeningRoomsResult.data[0];
        if (screeningRoom === undefined) {
            throw new Error('Screening Room Not Found');
        }

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    screeningRoom = createFromBody(req, false);
                    debug('saving screeningRoom...', screeningRoom);
                    await placeService.updateScreeningRoom(screeningRoom);

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
            ...screeningRoom,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // 施設を補完
            if (typeof req.body.containedInPlace === 'string' && req.body.containedInPlace.length > 0) {
                forms.containedInPlace = JSON.parse(req.body.containedInPlace);
            } else {
                forms.containedInPlace = undefined;
            }
        }

        res.render('places/screeningRoom/update', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
screeningRoomRouter.delete<ParamsDictionary>(
    '/:id',
    async (req, res) => {
        try {
            const splittedId = req.params.id.split(':');
            const movieTheaterBranchCode = splittedId[0];
            const screeningRoomBranchCode = splittedId[1];

            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchScreeningRoomsResult = await placeService.searchScreeningRooms({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                branchCode: { $eq: screeningRoomBranchCode },
                containedInPlace: {
                    branchCode: { $eq: movieTheaterBranchCode }
                }
            });
            const screeningRoom = searchScreeningRoomsResult.data[0];
            if (screeningRoom === undefined) {
                throw new Error('Screening Room Not Found');
            }
            await preDelete(req, screeningRoom);

            await placeService.deleteScreeningRoom({
                project: { id: req.project.id },
                branchCode: screeningRoomBranchCode,
                containedInPlace: { branchCode: movieTheaterBranchCode }
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(req: Request, screeningRoom: chevre.factory.place.screeningRoom.IPlace) {
    // スケジュールが存在するかどうか
    const eventService = new chevre.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        eventStatuses: [
            chevre.factory.eventStatusType.EventPostponed,
            chevre.factory.eventStatusType.EventRescheduled,
            chevre.factory.eventStatusType.EventScheduled
        ],
        location: { branchCode: { $eq: screeningRoom.branchCode } },
        superEvent: {
            location: { id: { $eq: screeningRoom.containedInPlace?.id } }
        }
    });
    if (searchEventsResult.data.length > 0) {
        throw new Error('関連するスケジュールが存在します');
    }
}

function createFromBody(req: Request, isNew: boolean): chevre.factory.place.screeningRoom.IPlace {
    let openSeatingAllowed: boolean | undefined;
    if (req.body.openSeatingAllowed === '1') {
        openSeatingAllowed = true;
    }

    const selectedContainedInPlace = JSON.parse(req.body.containedInPlace);

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.placeType.ScreeningRoom,
        branchCode: req.body.branchCode,
        name: req.body.name,
        address: req.body.address,
        containedInPlace: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: chevre.factory.placeType.MovieTheater,
            branchCode: selectedContainedInPlace.branchCode
        },
        containsPlace: [], // 更新しないため空でよし
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        ...(typeof openSeatingAllowed === 'boolean')
            ? { openSeatingAllowed: openSeatingAllowed }
            : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    noExistingAttributeName: 1, // $unsetは空だとエラーになるので
                    ...(openSeatingAllowed === undefined) ? { 'containsPlace.$[screeningRoom].openSeatingAllowed': 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        body('containedInPlace')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),

        body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12)),

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64))
    ];
}

export default screeningRoomRouter;
