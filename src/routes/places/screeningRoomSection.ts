/**
 * セクションルーター
 */
import { chevre } from '@cinerino/sdk';
import * as csvtojson from 'csvtojson';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { NO_CONTENT } from 'http-status';

import { RESERVED_CODE_VALUES } from '../../factory/reservedCodeValues';
import { ISubscription } from '../../factory/subscription';
import * as Message from '../../message';

// tslint:disable-next-line:no-require-imports no-var-requires
const subscriptions: ISubscription[] = require('../../../subscriptions.json');

const debug = createDebug('chevre-backend:router');

const NUM_ADDITIONAL_PROPERTY = 5;

const screeningRoomSectionRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
screeningRoomSectionRouter.all<ParamsDictionary>(
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
                    const screeningRoomSection = await createFromBody(req, true);

                    // const { data } = await placeService.searchScreeningRooms({});
                    // const existingMovieTheater = data.find((d) => d.branchCode === screeningRoom.branchCode);
                    // if (existingMovieTheater !== undefined) {
                    //     throw new Error('コードが重複しています');
                    // }

                    await placeService.createScreeningRoomSection(screeningRoomSection);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/places/screeningRoomSection/${screeningRoomSection.containedInPlace?.containedInPlace?.branchCode}:${screeningRoomSection.containedInPlace?.branchCode}:${screeningRoomSection.branchCode}/update`);

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
            if (typeof req.body.containedInPlace?.containedInPlace === 'string'
                && req.body.containedInPlace.containedInPlace.length > 0) {
                forms.containedInPlace.containedInPlace = JSON.parse(req.body.containedInPlace.containedInPlace);
                // } else {
                //     forms.containedInPlace = undefined;
            }
        }

        res.render('places/screeningRoomSection/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

screeningRoomSectionRouter.get(
    '',
    async (__, res) => {
        res.render('places/screeningRoomSection/index', {
            message: ''
        });
    }
);

screeningRoomSectionRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await placeService.searchScreeningRoomSections({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                branchCode: {
                    $regex: (typeof req.query?.branchCode?.$eq === 'string'
                        && req.query?.branchCode?.$eq.length > 0)
                        ? req.query?.branchCode?.$eq
                        : undefined
                },
                containedInPlace: {
                    branchCode: {
                        $eq: (typeof req.query?.containedInPlace?.branchCode?.$eq === 'string'
                            && req.query?.containedInPlace?.branchCode?.$eq.length > 0)
                            ? req.query?.containedInPlace?.branchCode?.$eq
                            : undefined
                    },
                    containedInPlace: {
                        branchCode: {
                            $eq: (typeof req.query?.containedInPlace?.containedInPlace?.branchCode?.$eq === 'string'
                                && req.query?.containedInPlace?.containedInPlace?.branchCode?.$eq.length > 0)
                                ? req.query?.containedInPlace?.containedInPlace?.branchCode?.$eq
                                : undefined
                        }
                    }
                },
                name: {
                    $regex: (typeof req.query?.name?.$regex === 'string'
                        && req.query?.name?.$regex.length > 0)
                        ? req.query?.name?.$regex
                        : undefined
                },
                $projection: { seatCount: 1 }
            });

            const results = data.map((seat, index) => {
                return {
                    ...seat,
                    id: `${seat.branchCode}:${index}`
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

// tslint:disable-next-line:use-default-type-parameter
screeningRoomSectionRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const splittedId = req.params.id.split(':');
            const movieTheaterBranchCode = splittedId[0];
            const screeningRoomBranchCode = splittedId[1];
            // tslint:disable-next-line:no-magic-numbers
            const screeningRoomSectionBranchCode = splittedId[2];

            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchScreeningRoomSectionsResult = await placeService.searchScreeningRoomSections({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                branchCode: { $eq: screeningRoomSectionBranchCode },
                containedInPlace: {
                    branchCode: { $eq: screeningRoomBranchCode },
                    containedInPlace: {
                        branchCode: { $eq: movieTheaterBranchCode }
                    }
                },
                $projection: { seatCount: 1 }
            });

            const screeningRoomSection = searchScreeningRoomSectionsResult.data[0];
            if (screeningRoomSection === undefined) {
                throw new Error('Screening Room Section Not Found');
            }

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        const originalSeatCount = screeningRoomSection.seatCount;
                        const newScreeningRoomSection = await createFromBody(req, false);

                        await preUpdate(req, newScreeningRoomSection, originalSeatCount);

                        await placeService.updateScreeningRoomSection(newScreeningRoomSection);

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
                ...screeningRoomSection,
                ...req.body,
                containedInPlace: screeningRoomSection.containedInPlace
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }

            if (req.method === 'POST') {
                // 施設を補完
                if (typeof req.body.containedInPlace?.containedInPlace === 'string'
                    && req.body.containedInPlace.containedInPlace.length > 0) {
                    forms.containedInPlace.containedInPlace = JSON.parse(req.body.containedInPlace.containedInPlace);
                    // } else {
                    //     forms.containedInPlace = undefined;
                }
            }

            res.render('places/screeningRoomSection/update', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (error) {
            next(error);
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
screeningRoomSectionRouter.delete<ParamsDictionary>(
    '/:id',
    async (req, res) => {
        const splittedId = req.params.id.split(':');
        const movieTheaterBranchCode = splittedId[0];
        const screeningRoomBranchCode = splittedId[1];
        // tslint:disable-next-line:no-magic-numbers
        const screeningRoomSectionBranchCode = splittedId[2];

        const placeService = new chevre.service.Place({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        await placeService.deleteScreeningRoomSection({
            // project: { id: req.project.id },
            branchCode: screeningRoomSectionBranchCode,
            containedInPlace: {
                branchCode: screeningRoomBranchCode,
                containedInPlace: {
                    branchCode: movieTheaterBranchCode
                }
            }
        });

        res.status(NO_CONTENT)
            .end();
    }
);

async function createFromBody(
    req: Request,
    isNew: boolean
): Promise<chevre.factory.place.screeningRoomSection.IPlace & chevre.service.IUnset> {
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchSeatingTypesResult = await categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
    });
    const seatingTypes = searchSeatingTypesResult.data;

    let containsPlace: chevre.factory.place.seat.IPlace[] = [];
    const containsPlaceCsv = req.body.containsPlace;
    const seatBranchCodeRegex = /^[0-9a-zA-Z\-]+$/;
    if (typeof containsPlaceCsv === 'string' && containsPlaceCsv.length > 0) {
        // tslint:disable-next-line:await-promise
        const containsPlaceFronCsv = await csvtojson()
            .fromString(containsPlaceCsv);
        if (Array.isArray(containsPlaceFronCsv)) {
            containsPlace = containsPlaceFronCsv.filter((p) => {
                return typeof p.branchCode === 'string'
                    && p.branchCode.length > 0
                    && seatBranchCodeRegex.test(p.branchCode);
            })
                .map((p) => {
                    let seatingTypeCodeValue: string | undefined;
                    if (typeof p.seatingType === 'string') {
                        seatingTypeCodeValue = seatingTypes.find((s) => s.codeValue === p.seatingType)?.codeValue;
                    }

                    const name: chevre.factory.multilingualString = {
                        ...(typeof p.name?.ja === 'string' && p.name.ja.length > 0) ? {
                            ja: String(p.name.ja)
                                // tslint:disable-next-line:no-magic-numbers
                                .slice(0, 64)
                        } : undefined,
                        ...(typeof p.name?.en === 'string' && p.name.en.length > 0) ? {
                            en: String(p.name.en)
                                // tslint:disable-next-line:no-magic-numbers
                                .slice(0, 64)
                        } : undefined
                    };

                    return {
                        project: { typeOf: req.project.typeOf, id: req.project.id },
                        typeOf: chevre.factory.placeType.Seat,
                        branchCode: String(p.branchCode)
                            // tslint:disable-next-line:no-magic-numbers
                            .slice(0, 12),
                        seatingType: (typeof seatingTypeCodeValue === 'string') ? [seatingTypeCodeValue] : [],
                        additionalProperty: [],
                        ...(typeof name.ja === 'string' || typeof name.en === 'string') ? { name } : undefined
                    };
                });
        }
    }

    const selecetedTheater = JSON.parse(req.body.containedInPlace.containedInPlace);

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.placeType.ScreeningRoomSection,
        branchCode: req.body.branchCode,
        name: req.body.name,
        containedInPlace: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: chevre.factory.placeType.ScreeningRoom,
            branchCode: req.body.containedInPlace.branchCode,
            containedInPlace: {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: chevre.factory.placeType.MovieTheater,
                branchCode: selecetedTheater.branchCode
            }
        },
        containsPlace: containsPlace,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    noExistingAttributeName: 1 // $unsetは空だとエラーになるので
                    // ...(seatingType === undefined)
                    //     ? { 'containsPlace.$[screeningRoom].containsPlace.$[screeningRoomSection].containsPlace.$[seat].seatingType': 1 }
                    //     : undefined
                }
            }
            : undefined
    };
}

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
        body('containedInPlace.containedInPlace')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        body('containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ルーム')),
        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        body('name.en')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '英語名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('英語名称', 64))
    ];
}

async function preUpdate(req: Request, section: chevre.factory.place.screeningRoomSection.IPlace, originalSeatCount?: number) {
    const placeService = new chevre.service.Place({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const projectService = new chevre.service.Project({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: '' }
    });

    const searchScreeningRoomsResult = await placeService.searchScreeningRooms({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        branchCode: { $eq: section.containedInPlace?.branchCode },
        containedInPlace: {
            branchCode: { $eq: section.containedInPlace?.containedInPlace?.branchCode }
        },
        $projection: { seatCount: 1 }
    });
    const screeningRoom = searchScreeningRoomsResult.data.shift();
    if (screeningRoom === undefined) {
        throw new Error('ルームが存在しません');
    }

    const seatCount = screeningRoom.seatCount;
    if (typeof seatCount !== 'number') {
        throw new Error('ルーム座席数が不明です');
    }
    if (typeof originalSeatCount !== 'number') {
        throw new Error('セクション座席数が不明です');
    }

    // サブスクリプションからmaximumAttendeeCapacityを取得
    const chevreProject = await projectService.findById({ id: req.project.id });
    let subscriptionIdentifier = chevreProject.subscription?.identifier;
    if (subscriptionIdentifier === undefined) {
        subscriptionIdentifier = 'Free';
    }
    const subscription = subscriptions.find((s) => s.identifier === subscriptionIdentifier);
    const maximumAttendeeCapacitySetting = subscription?.settings.maximumAttendeeCapacity;
    // 座席の更新がある場合、座席数がmax以内かどうか
    if (Array.isArray(section.containsPlace) && section.containsPlace.length > 0) {
        if (typeof maximumAttendeeCapacitySetting === 'number') {
            if (seatCount - originalSeatCount + section.containsPlace.length > maximumAttendeeCapacitySetting) {
                throw new Error(`ルーム座席数の最大値は${maximumAttendeeCapacitySetting}です`);
            }
        }
    }
}

export { screeningRoomSectionRouter };
