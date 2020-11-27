/**
 * 施設ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';

import * as Message from '../../message';

const debug = createDebug('chevre-console:router');

const NUM_ADDITIONAL_PROPERTY = 5;

const movieTheaterRouter = Router();

movieTheaterRouter.all<any>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    debug(req.body);
                    req.body.id = '';
                    let movieTheater = await createMovieTheaterFromBody(req, true);
                    const placeService = new chevre.service.Place({
                        endpoint: <string>process.env.API_ENDPOINT,
                        auth: req.user.authClient
                    });

                    const { data } = await placeService.searchMovieTheaters({
                        limit: 100,
                        project: { ids: [req.project.id] }
                    });
                    const existingMovieTheater = data.find((d) => d.branchCode === movieTheater.branchCode);
                    if (existingMovieTheater !== undefined) {
                        throw new Error('コードが重複しています');
                    }

                    debug('existingMovieTheater:', existingMovieTheater);

                    movieTheater = await placeService.createMovieTheater(<any>movieTheater);
                    req.flash('message', '登録しました');
                    res.redirect(`/places/movieTheater/${movieTheater.id}/update`);

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

        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

        res.render('places/movieTheater/new', {
            message: message,
            errors: errors,
            forms: forms,
            sellers: searchSellersResult.data
        });
    }
);

movieTheaterRouter.get(
    '',
    (_, res) => {
        res.render('places/movieTheater/index', {
            message: ''
        });
    }
);

movieTheaterRouter.get(
    '/search',
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const sellerService = new chevre.service.Seller({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

            const branchCodeRegex = req.query.branchCode?.$regex;
            const nameRegex = req.query.name;
            const parentOrganizationIdEq = req.query.parentOrganization?.id;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await placeService.searchMovieTheaters({
                limit: limit,
                page: page,
                project: { ids: [req.project.id] },
                branchCode: {
                    $regex: (typeof branchCodeRegex === 'string' && branchCodeRegex.length > 0)
                        ? branchCodeRegex
                        : undefined
                },
                name: (typeof nameRegex === 'string' && nameRegex.length > 0)
                    ? nameRegex
                    : undefined,
                parentOrganization: {
                    id: {
                        $eq: (typeof parentOrganizationIdEq === 'string' && parentOrganizationIdEq.length > 0)
                            ? parentOrganizationIdEq
                            : undefined
                    }
                }
            });

            const results = data.map((movieTheater) => {
                const availabilityEndsGraceTimeInMinutes =
                    (movieTheater.offers !== undefined
                        && movieTheater.offers.availabilityEndsGraceTime !== undefined
                        && movieTheater.offers.availabilityEndsGraceTime.value !== undefined)
                        // tslint:disable-next-line:no-magic-numbers
                        ? Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60)
                        : undefined;

                const seller = searchSellersResult.data.find((s) => s.id === movieTheater.parentOrganization?.id);

                return {
                    ...movieTheater,
                    parentOrganizationName: (typeof seller?.name === 'string')
                        ? seller?.name
                        : String(seller?.name?.ja),
                    posCount: (Array.isArray((<any>movieTheater).hasPOS)) ? (<any>movieTheater).hasPOS.length : 0,
                    availabilityStartsGraceTimeInDays:
                        (movieTheater.offers !== undefined
                            && movieTheater.offers.availabilityStartsGraceTime !== undefined
                            && movieTheater.offers.availabilityStartsGraceTime.value !== undefined)
                            // tslint:disable-next-line:no-magic-numbers
                            ? -movieTheater.offers.availabilityStartsGraceTime.value
                            : undefined,
                    availabilityEndsGraceTimeInMinutes:
                        (availabilityEndsGraceTimeInMinutes !== undefined)
                            ? (availabilityEndsGraceTimeInMinutes >= 0)
                                ? `${availabilityEndsGraceTimeInMinutes}分後`
                                : `${-availabilityEndsGraceTimeInMinutes}分前`
                            : undefined
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

movieTheaterRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            await placeService.deleteMovieTheater({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
movieTheaterRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        let movieTheater = await placeService.findMovieTheaterById({
            id: req.params.id
        });

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    movieTheater = <any>await createMovieTheaterFromBody(req, false);
                    debug('saving an movie theater...', movieTheater);
                    await placeService.updateMovieTheater(movieTheater);

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
            // tslint:disable-next-line:no-null-keyword
            offersStr: (movieTheater.offers !== undefined) ? JSON.stringify(movieTheater.offers, null, '\t') : '{"typeOf":"Offer"}',
            ...movieTheater,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchSellersResult = await sellerService.search({ project: { id: { $eq: req.project.id } } });

        res.render('places/movieTheater/update', {
            message: message,
            errors: errors,
            forms: forms,
            sellers: searchSellersResult.data
        });
    }
);

movieTheaterRouter.get(
    '/:id/screeningRooms',
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const movieTheater = await placeService.findMovieTheaterById({
                id: req.params.id
            });
            const screeningRooms = movieTheater.containsPlace.map((screen) => {
                let numSeats = 0;
                if (Array.isArray(screen.containsPlace)) {
                    numSeats += screen.containsPlace.reduce(
                        (a, b) => {
                            return a + ((b.containsPlace !== undefined) ? b.containsPlace.length : 0);
                        },
                        0
                    );
                }

                return {
                    ...screen,
                    name: screen.name !== undefined
                        ? (typeof screen.name === 'string') ? screen.name : screen.name.ja
                        : '',
                    numSeats: numSeats
                };
            });

            screeningRooms.sort((screen1, screen2) => {
                if (typeof screen1.name === 'string' && screen2.name === 'strring') {
                    if (screen1.name > screen2.name) {
                        return 1;
                    }
                    if (screen1.name < screen2.name) {
                        return -1;
                    }
                }

                return 0;
            });

            res.json({
                success: true,
                results: screeningRooms
            });
        } catch (err) {
            res.json({
                success: false,
                message: err.message,
                results: []
            });
        }
    }
);

async function createMovieTheaterFromBody(
    req: Request, isNew: boolean
): Promise<chevre.factory.place.movieTheater.IPlaceWithoutScreeningRoom> {
    const parentOrganizationId = req.body.parentOrganization?.id;

    const sellerService = new chevre.service.Seller({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const seller = await sellerService.findById({ id: parentOrganizationId });

    const parentOrganization: chevre.factory.place.movieTheater.IParentOrganization = {
        // project: { typeOf: seller.project.typeOf, id: seller.project.id },
        typeOf: seller.typeOf,
        id: seller.id
    };

    let hasPOS: chevre.factory.place.movieTheater.IPOS[] = [];
    if (typeof req.body.hasPOSStr === 'string' && req.body.hasPOSStr.length > 0) {
        hasPOS = JSON.parse(req.body.hasPOSStr);
    }
    if (!Array.isArray(hasPOS)) {
        throw new Error('hasPOSはArrayを入力してください');
    }

    let hasEntranceGate: chevre.factory.place.movieTheater.IEntranceGate[] = [];
    if (typeof req.body.hasEntranceGateStr === 'string' && req.body.hasEntranceGateStr.length > 0) {
        hasEntranceGate = JSON.parse(req.body.hasEntranceGateStr);
    }
    if (!Array.isArray(hasEntranceGate)) {
        throw new Error('hasEntranceGateはArrayを入力してください');
    }

    const url: string | undefined = (typeof req.body.url === 'string' && req.body.url.length > 0) ? req.body.url : undefined;

    // tslint:disable-next-line:no-unnecessary-local-variable
    const movieTheater: chevre.factory.place.movieTheater.IPlaceWithoutScreeningRoom = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        id: req.body.id,
        typeOf: chevre.factory.placeType.MovieTheater,
        branchCode: req.body.branchCode,
        name: req.body.name,
        kanaName: req.body.kanaName,
        hasEntranceGate: hasEntranceGate,
        hasPOS: hasPOS,
        offers: JSON.parse(req.body.offersStr),
        parentOrganization: parentOrganization,
        telephone: req.body.telephone,
        screenCount: 0,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        ...(typeof url === 'string') ? { url: url } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(url === undefined) ? { url: 1 } : undefined
                }
            }
            : undefined
    };

    return movieTheater;
}

function validate() {
    return [
        body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .isLength({ max: 20 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 20)),

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),

        body('parentOrganization.id')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '親組織'))
    ];
}

export default movieTheaterRouter;
