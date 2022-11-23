/**
 * 施設ルーター
 */
import { chevre, factory } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';
import * as moment from 'moment';

import { RESERVED_CODE_VALUES } from '../../factory/reservedCodeValues';
import * as Message from '../../message';

import { validateCsrfToken } from '../../middlewares/validateCsrfToken';

const debug = createDebug('chevre-console:router');

export const MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS = 93;
export const ONE_MONTH_IN_SECONDS = 2678400; // 60 * 60 * 24 * 31
const NUM_ADDITIONAL_PROPERTY = 10;

const movieTheaterRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
movieTheaterRouter.all<ParamsDictionary>(
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
                    let movieTheater = await createMovieTheaterFromBody(req, true);
                    const placeService = new chevre.service.Place({
                        endpoint: <string>process.env.API_ENDPOINT,
                        auth: req.user.authClient,
                        project: { id: req.project.id }
                    });

                    movieTheater = await placeService.createMovieTheater(movieTheater);

                    // tslint:disable-next-line:no-dynamic-delete
                    delete (<Express.Session>req.session).csrfSecret;
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/places/movieTheater/${movieTheater.id}/update`);

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

        const defaultOffers: chevre.factory.place.movieTheater.IOffer = {
            priceCurrency: chevre.factory.priceCurrency.JPY,
            project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
            typeOf: chevre.factory.offerType.Offer,
            eligibleQuantity: {
                typeOf: 'QuantitativeValue',
                maxValue: 6,
                unitCode: chevre.factory.unitCode.C62
            },
            availabilityStartsGraceTime: {
                typeOf: 'QuantitativeValue',
                value: -2,
                unitCode: chevre.factory.unitCode.Day
            },
            availabilityEndsGraceTime: {
                typeOf: 'QuantitativeValue',
                value: 1200,
                unitCode: chevre.factory.unitCode.Sec
            },
            availabilityStartsGraceTimeOnPOS: {
                typeOf: 'QuantitativeValue',
                value: -MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS,
                unitCode: chevre.factory.unitCode.Day
            },
            availabilityEndsGraceTimeOnPOS: {
                typeOf: 'QuantitativeValue',
                value: ONE_MONTH_IN_SECONDS,
                unitCode: chevre.factory.unitCode.Sec
            }
        };

        const forms = {
            additionalProperty: [],
            hasEntranceGate: [],
            hasPOS: [],
            name: {},
            offers: defaultOffers,
            ...(typeof csrfToken === 'string') ? { csrfToken } : undefined,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.hasEntranceGate.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.hasEntranceGate.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasEntranceGate.length)].map(() => {
                return {};
            }));
        }
        if (forms.hasPOS.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.hasPOS.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasPOS.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // 親組織を補完
            if (typeof req.body.parentOrganization === 'string' && req.body.parentOrganization.length > 0) {
                forms.parentOrganization = JSON.parse(req.body.parentOrganization);
            } else {
                forms.parentOrganization = undefined;
            }
        } else {
            forms.offers = defaultOffers;
        }

        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
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
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const branchCodeRegex = req.query.branchCode?.$regex;
            const nameRegex = req.query.name;
            const parentOrganizationIdEq = req.query.parentOrganization?.id;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await placeService.searchMovieTheaters({
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
                    (typeof movieTheater.offers?.availabilityEndsGraceTime?.value === 'number')
                        // tslint:disable-next-line:no-magic-numbers
                        ? Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60)
                        : undefined;

                return {
                    ...movieTheater,
                    posCount: (Array.isArray(movieTheater.hasPOS)) ? movieTheater.hasPOS.length : 0,
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
                            : undefined,
                    availabilityStartsGraceTimeInDaysOnPOS:
                        (typeof movieTheater.offers?.availabilityStartsGraceTimeOnPOS?.value === 'number')
                            // tslint:disable-next-line:no-magic-numbers
                            ? -movieTheater.offers.availabilityStartsGraceTimeOnPOS.value
                            : undefined,
                    availabilityEndsGraceTimeInMinutesOnPOS:
                        (typeof movieTheater.offers?.availabilityEndsGraceTimeOnPOS?.value === 'number')
                            ? `${moment.duration(movieTheater.offers.availabilityEndsGraceTimeOnPOS.value, 'seconds')
                                .humanize()}後`
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
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchMovieTheatersResult = await placeService.searchMovieTheaters({
                limit: 1,
                id: { $eq: req.params.id }
            });
            const movieTheater = searchMovieTheatersResult.data.shift();
            if (movieTheater === undefined) {
                throw new Error('施設が見つかりません');
            }
            await preDelete(req, movieTheater);

            await placeService.deleteMovieTheater({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(req: Request, movieTheater: chevre.factory.place.movieTheater.IPlaceWithoutScreeningRoom) {
    // 施設コンテンツが存在するかどうか
    const eventService = new chevre.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEventSeries,
        location: { branchCode: { $eq: movieTheater.branchCode } }
    });
    if (searchEventsResult.data.length > 0) {
        throw new Error('関連する施設コンテンツが存在します');
    }
}

// tslint:disable-next-line:use-default-type-parameter
movieTheaterRouter.all<ParamsDictionary>(
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
        const sellerService = new chevre.service.Seller({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        const searchMovieTheatersResult = await placeService.searchMovieTheaters({ limit: 1, id: { $eq: req.params.id } });
        let movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new Error('施設が見つかりません');
        }

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    movieTheater = await createMovieTheaterFromBody(req, false);
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
            hasEntranceGate: [],
            hasPOS: [],
            ...movieTheater,
            ...req.body
        };

        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.hasEntranceGate.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.hasEntranceGate.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasEntranceGate.length)].map(() => {
                return {};
            }));
        }
        if (forms.hasPOS.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.hasPOS.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.hasPOS.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // 親組織を補完
            if (typeof req.body.parentOrganization === 'string' && req.body.parentOrganization.length > 0) {
                forms.parentOrganization = JSON.parse(req.body.parentOrganization);
            } else {
                forms.parentOrganization = undefined;
            }
        } else {
            forms.offers = movieTheater.offers;

            if (typeof movieTheater.parentOrganization?.id === 'string') {
                const seller = await sellerService.findById({
                    id: movieTheater.parentOrganization.id
                });
                forms.parentOrganization = { id: seller.id, name: seller.name };
            } else {
                forms.parentOrganization = undefined;
            }
        }

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
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            // ルーム検索(とりあえずmax100件)
            const searchRoomsResult = await placeService.searchScreeningRooms({
                limit: 100,
                containedInPlace: { id: { $eq: req.params.id } },
                $projection: {
                    sectionCount: 1,
                    seatCount: 1
                }
            });
            const screeningRooms = searchRoomsResult.data.map((room) => {
                return {
                    ...room,
                    name: (typeof room.name === 'string') ? room.name : room.name.ja,
                    numSeats: room.seatCount
                };
            });

            screeningRooms.sort((screen1, screen2) => {
                if (typeof screen1.name === 'string' && screen2.name === 'string') {
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

// tslint:disable-next-line:max-func-body-length
async function createMovieTheaterFromBody(
    req: Request, isNew: boolean
): Promise<chevre.factory.place.movieTheater.IPlaceWithoutScreeningRoom & chevre.service.IUnset> {
    const selectedSeller = JSON.parse(req.body.parentOrganization);
    const sellerService = new chevre.service.Seller({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const seller = await sellerService.findById({ id: selectedSeller.id });

    const parentOrganization: chevre.factory.place.movieTheater.IParentOrganization = {
        typeOf: seller.typeOf,
        id: String(seller.id)
    };

    let hasPOS: chevre.factory.place.movieTheater.IPOS[] = [];
    if (Array.isArray(req.body.hasPOS)) {
        hasPOS = req.body.hasPOS.filter((p: any) => typeof p.id === 'string' && p.id.length > 0
            && typeof p.name === 'string' && p.name.length > 0)
            .map((p: any) => {
                return {
                    id: String(p.id),
                    name: String(p.name)
                };
            });
    }

    let hasEntranceGate: chevre.factory.place.movieTheater.IEntranceGate[] = [];
    if (Array.isArray(req.body.hasEntranceGate)) {
        hasEntranceGate = (<any[]>req.body.hasEntranceGate).filter((p) => {
            return typeof p.identifier === 'string' && p.identifier.length > 0
                && typeof p.name?.ja === 'string' && p.name.ja.length > 0;
        })
            .map((p) => {
                return {
                    typeOf: factory.placeType.Place,
                    identifier: String(p.identifier),
                    name: {
                        ja: String(p.name.ja),
                        ...(typeof p.name?.en === 'string' && p.name.en.length > 0) ? { en: String(p.name.en) } : undefined
                    }
                };
            });
    }

    const url: string | undefined = (typeof req.body.url === 'string' && req.body.url.length > 0) ? req.body.url : undefined;

    const offers: chevre.factory.place.movieTheater.IOffer = {
        priceCurrency: chevre.factory.priceCurrency.JPY,
        project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
        typeOf: chevre.factory.offerType.Offer,
        eligibleQuantity: {
            typeOf: 'QuantitativeValue',
            unitCode: chevre.factory.unitCode.C62,
            ...(typeof req.body.offers?.eligibleQuantity?.maxValue === 'number')
                ? { maxValue: req.body.offers.eligibleQuantity.maxValue }
                : undefined
        },
        availabilityStartsGraceTime: {
            typeOf: 'QuantitativeValue',
            unitCode: chevre.factory.unitCode.Day,
            ...(typeof req.body.offers?.availabilityStartsGraceTime?.value === 'number')
                ? { value: req.body.offers.availabilityStartsGraceTime.value }
                : undefined
        },
        availabilityEndsGraceTime: {
            typeOf: 'QuantitativeValue',
            unitCode: chevre.factory.unitCode.Sec,
            ...(typeof req.body.offers?.availabilityEndsGraceTime?.value === 'number')
                ? { value: req.body.offers.availabilityEndsGraceTime.value }
                : undefined
        },
        // POSの興行初期設定を自動追加(2022-11-23~)
        availabilityStartsGraceTimeOnPOS: {
            typeOf: 'QuantitativeValue',
            unitCode: chevre.factory.unitCode.Day,
            value: -MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS
        },
        availabilityEndsGraceTimeOnPOS: {
            typeOf: 'QuantitativeValue',
            unitCode: chevre.factory.unitCode.Sec,
            value: ONE_MONTH_IN_SECONDS
        }
    };

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
        offers: offers,
        parentOrganization: parentOrganization,
        telephone: req.body.telephone,
        screenCount: 0,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name.length > 0)
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

// tslint:disable-next-line:max-func-body-length
function validate() {
    return [
        body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 2, max: 12 })
            .withMessage('2~12文字で入力してください')
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

        body('parentOrganization')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '親組織')),

        body('offers.eligibleQuantity.maxValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '販売上限席数'))
            .isInt({ min: 0, max: 50 })
            .toInt()
            .withMessage(() => '0~50の間で入力してください'),

        body('offers.availabilityStartsGraceTime.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '販売開始設定'))
            .isInt()
            .toInt(),

        body('offers.availabilityEndsGraceTime.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '販売終了設定'))
            .isInt()
            .toInt(),

        body('hasPOS')
            .optional()
            .isArray()
            .custom((value) => {
                // POSコードの重複確認
                const posCodes = (<any[]>value)
                    .filter((p) => String(p.id).length > 0)
                    .map((p) => p.id);
                const posCodesAreUnique = posCodes.length === [...new Set(posCodes)].length;
                if (!posCodesAreUnique) {
                    throw new Error('POSコードが重複しています');
                }

                return true;
            }),
        body('hasPOS.*.id')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isString()
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage(() => '英数字で入力してください')
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12)),
        body('hasPOS.*.name')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isString()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),

        body('hasEntranceGate')
            .optional()
            .isArray()
            .custom((value) => {
                // 入場ゲートコードの重複確認
                const identifiers = (<any[]>value)
                    .filter((p) => String(p.identifier).length > 0)
                    .map((p) => p.identifier);
                const identifiersAreUnique = identifiers.length === [...new Set(identifiers)].length;
                if (!identifiersAreUnique) {
                    throw new Error('入場ゲートコードが重複しています');
                }

                return true;
            }),
        body('hasEntranceGate.*.identifier')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isString()
            .matches(/^[0-9a-zA-Z_]+$/)
            .withMessage(() => '英数字で入力してください')
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12))
    ];
}

export { movieTheaterRouter };
