/**
 * 施設コンテンツルーター
 */
import { chevre } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';

import { TranslationTypeCode, translationTypes } from '../../factory/translationType';

import * as Message from '../../message';

import { validateCsrfToken } from '../../middlewares/validateCsrfToken';

export const DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET = 'MovieTicket';

const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_NAME: number = 64;
const NAME_MAX_LENGTH_DESCRIPTION: number = 64;

const screeningEventSeriesRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all<ParamsDictionary>(
    '/add',
    validateCsrfToken,
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        const eventService = new chevre.service.Event({
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
                    let placeIds: string[];
                    if (Array.isArray(req.body.location)) {
                        const selectedLocations = (<any[]>req.body.location).map((location) => {
                            return JSON.parse(String(location));
                        });

                        placeIds = selectedLocations.map<string>((selectedLocation) => String(selectedLocation.id));
                    } else {
                        const selectedLocation = JSON.parse(req.body.location);
                        placeIds = [selectedLocation.id];
                    }

                    if (placeIds.length > 0) {
                        let attributesList: chevre.factory.event.screeningEventSeries.ICreateParams[] = [];
                        attributesList = placeIds.map((placeId) => {
                            return createEventFromBody(req, { id: placeId }, true);
                        });
                        const events = await eventService.create(attributesList);
                        // tslint:disable-next-line:no-dynamic-delete
                        delete (<Express.Session>req.session).csrfSecret;
                        req.flash('message', `${events.length}つの施設コンテンツを登録しました`);
                        const redirect = `/projects/${req.project.id}/events/screeningEventSeries/${events[0].id}/update`;
                        res.redirect(redirect);

                        return;
                    } else {
                        throw new Error('施設を選択してください');
                    }
                } catch (error) {
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
            description: {},
            headline: {},
            workPerformed: {},
            videoFormatType: [],
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
            // 施設を補完
            if (typeof req.body.location === 'string' && req.body.location.length > 0) {
                forms.location = [JSON.parse(req.body.location)];
            } else if (Array.isArray(req.body.location)) {
                forms.location = req.body.location.map((location: any) => {
                    return JSON.parse(String(location));
                });
            } else {
                forms.location = undefined;
            }

            // 上映方式を補完
            if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
                forms.videoFormat = (<string[]>req.body.videoFormat).map((v) => JSON.parse(v));
            } else {
                forms.videoFormat = [];
            }
        }

        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchProductsResult = await productService.search({
            project: { id: { $eq: req.project.id } },
            typeOf: {
                $in: [
                    chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                    chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                ]
            }
        });

        res.render('events/screeningEventSeries/add', {
            message: message,
            errors: errors,
            forms: forms,
            movie: undefined,
            translationTypes,
            paymentServices: searchProductsResult.data
        });
    }
);

screeningEventSeriesRouter.get(
    '',
    async (__, res) => {
        res.render('events/screeningEventSeries/index', {
        });
    }
);

screeningEventSeriesRouter.get(
    '/getlist',
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
            const { data } = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
                limit: limit,
                page: page,
                sort: {
                    startDate: (req.query.sortType === String(chevre.factory.sortType.Descending))
                        ? chevre.factory.sortType.Descending
                        : chevre.factory.sortType.Ascending
                },
                project: { id: { $eq: req.project.id } },
                // 空文字対応(2022-07-11~)
                name: (typeof req.query.name === 'string' && req.query.name.length > 0)
                    ? req.query.name
                    : undefined,
                typeOf: chevre.factory.eventType.ScreeningEventSeries,
                endFrom: (req.query.containsEnded === '1') ? undefined : new Date(),
                location: {
                    branchCode: {
                        $eq: (typeof req.query.locationBranchCode === 'string' && req.query.locationBranchCode.length > 0)
                            ? req.query.locationBranchCode
                            : undefined
                    }
                },
                soundFormat: {
                    typeOf: {
                        $eq: (typeof req.query.soundFormat?.typeOf?.$eq === 'string'
                            && req.query.soundFormat.typeOf.$eq.length > 0)
                            ? req.query.soundFormat.typeOf.$eq
                            : undefined
                    }
                },
                videoFormat: {
                    typeOf: {
                        $eq: (typeof req.query.videoFormat?.typeOf?.$eq === 'string'
                            && req.query.videoFormat.typeOf.$eq.length > 0)
                            ? req.query.videoFormat.typeOf.$eq
                            : undefined
                    }
                },
                workPerformed: {
                    identifiers: (typeof req.query.workPerformed?.identifier === 'string' && req.query.workPerformed?.identifier.length > 0)
                        ? [req.query.workPerformed?.identifier]
                        : undefined
                },
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
                results: data.map((event) => {
                    const eventVideoFormatTypes = (Array.isArray(event.videoFormat))
                        ? event.videoFormat.map((v) => v.typeOf)
                        : [];
                    let videoFormatName: string = '';
                    if (Array.isArray(eventVideoFormatTypes)) {
                        videoFormatName = eventVideoFormatTypes.join(' ');
                    }

                    const additionalPropertyMatched =
                        (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                            ? event.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                            : undefined;

                    return {
                        ...event,
                        videoFormatName,
                        workPerformed: {
                            ...event.workPerformed,
                            // 多言語対応(2022-07-13~)
                            name: (typeof event.workPerformed.name === 'string')
                                ? event.workPerformed.name
                                : event.workPerformed.name?.ja
                        },
                        ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
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

/**
 * 名前からコンテンツ候補を検索する
 */
screeningEventSeriesRouter.get(
    '/searchMovies',
    async (req, res) => {
        try {
            const creativeWorkService = new chevre.service.CreativeWork({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchMovieResult = await creativeWorkService.searchMovies({
                limit: 100,
                sort: { identifier: chevre.factory.sortType.Ascending },
                project: { id: { $eq: req.project.id } },
                offers: {
                    availableFrom: new Date()
                },
                // 空文字対応(2022-07-11~)
                name: (typeof req.query.q === 'string' && req.query.q.length > 0)
                    ? req.query.q
                    : undefined
            });

            res.json({
                data: searchMovieResult.data.map((d) => {
                    // 多言語名称対応
                    const movieName: string = (typeof d.name === 'string') ? d.name : String(d.name?.ja);

                    return {
                        ...d,
                        name: movieName
                    };
                })
            });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({
                    message: error.message
                });
        }
    }
);

screeningEventSeriesRouter.get(
    '/search',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // locationIdから施設コードへ変換しているが、施設コードで直接検索する(2022-10-01~)
            const locationId = req.query.locationId;
            const fromDate = <string | undefined>req.query.fromDate;
            const toDate = <string | undefined>req.query.toDate;

            // 上映終了して「いない」施設コンテンツを検索
            const limit = 100;
            const page = 1;
            const { data } = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                typeOf: chevre.factory.eventType.ScreeningEventSeries,
                inSessionFrom: (fromDate !== undefined)
                    ? moment(`${fromDate}T23:59:59+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate()
                    : new Date(),
                inSessionThrough: (toDate !== undefined)
                    ? moment(`${toDate}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                location: {
                    // branchCodes: [movieTheater.branchCode]
                    ...(typeof locationId === 'string') ? { id: { $eq: locationId } } : undefined
                },
                name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
            });
            const results = data.map((event) => {
                let mvtkFlg = 1;
                const unacceptedPaymentMethod = event.offers?.unacceptedPaymentMethod;
                if (Array.isArray(unacceptedPaymentMethod)
                    && unacceptedPaymentMethod.includes(DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET)) {
                    mvtkFlg = 0;
                }

                let translationType = '';
                if (event.subtitleLanguage !== undefined && event.subtitleLanguage !== null) {
                    translationType = '字幕';
                }
                if (event.dubLanguage !== undefined && event.dubLanguage !== null) {
                    translationType = '吹替';
                }

                return {
                    ...event,
                    id: event.id,
                    filmNameJa: event.name.ja,
                    filmNameEn: event.name.en,
                    kanaName: event.kanaName,
                    duration: moment.duration(event.duration)
                        .humanize(),
                    translationType: translationType,
                    videoFormat: event.videoFormat,
                    mvtkFlg: mvtkFlg
                };
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: results
            });
        } catch (_) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all<ParamsDictionary>(
    '/:eventId/update',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const creativeWorkService = new chevre.service.CreativeWork({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let message = '';
            let errors: any = {};
            const eventId = req.params.eventId;

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        const selectedLocation = JSON.parse(req.body.location);
                        const attributes = createEventFromBody(req, { id: selectedLocation.id }, false);
                        await eventService.update({
                            id: eventId,
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

            const event = await eventService.findById<chevre.factory.eventType.ScreeningEventSeries>({ id: eventId });

            let movie: chevre.factory.creativeWork.movie.ICreativeWork | undefined;
            const searchMovieResult = await creativeWorkService.searchMovies({
                project: { id: { $eq: req.project.id } },
                identifier: { $eq: event.workPerformed.identifier }
            });
            movie = searchMovieResult.data.shift();
            if (movie === undefined) {
                throw new Error(`Movie ${event.workPerformed.identifier} Not Found`);
            }

            let mvtkFlg = 1;
            const unacceptedPaymentMethod = event.offers?.unacceptedPaymentMethod;
            if (Array.isArray(unacceptedPaymentMethod)
                && unacceptedPaymentMethod.includes(DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET)) {
                mvtkFlg = 0;
            }

            let translationType = '';
            if (event.subtitleLanguage !== undefined && event.subtitleLanguage !== null) {
                translationType = TranslationTypeCode.Subtitle;
            }
            if (event.dubLanguage !== undefined && event.dubLanguage !== null) {
                translationType = TranslationTypeCode.Dubbing;
            }

            const forms = {
                additionalProperty: [],
                description: {},
                headline: {},
                ...event,
                ...req.body,
                nameJa: (typeof req.body.nameJa !== 'string' || req.body.nameJa.length === 0) ? event.name.ja : req.body.nameJa,
                nameEn: (typeof req.body.nameEn !== 'string' || req.body.nameEn.length === 0) ? event.name.en : req.body.nameEn,
                duration: (typeof req.body.duration !== 'string' || req.body.duration.length === 0)
                    ? moment.duration(event.duration)
                        .asMinutes()
                    : req.body.duration,
                translationType: translationType,
                videoFormatType: (Array.isArray(event.videoFormat)) ? event.videoFormat.map((f) => f.typeOf) : [],
                startDate: (typeof req.body.startDate !== 'string' || req.body.startDate.length === 0)
                    ? (event.startDate !== null)
                        ? moment(event.startDate)
                            .tz('Asia/Tokyo')
                            .format('YYYY/MM/DD')
                        : ''
                    : req.body.startDate,
                endDate: (typeof req.body.endDate !== 'string' || req.body.endDate.length === 0)
                    ? (event.endDate !== null) ? moment(event.endDate)
                        .tz('Asia/Tokyo')
                        .add(-1, 'day')
                        .format('YYYY/MM/DD')
                        : ''
                    : req.body.endDate,
                mvtkFlg: (typeof req.body.mvtkFlg !== 'string' || req.body.mvtkFlg.length === 0) ? mvtkFlg : req.body.mvtkFlg
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }

            if (req.method === 'POST') {
                // 施設を補完
                if (typeof req.body.location === 'string' && req.body.location.length > 0) {
                    forms.location = JSON.parse(req.body.location);
                } else {
                    forms.location = undefined;
                }

                // 上映方式を補完
                if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
                    forms.videoFormat = (<string[]>req.body.videoFormat).map((v) => JSON.parse(v));
                } else {
                    forms.videoFormat = [];
                }
            } else {
                if (typeof event.location.id === 'string') {
                    const searchMovieTheatersResult = await placeService.searchMovieTheaters({
                        limit: 1,
                        id: { $eq: event.location.id }
                    });
                    const movieTheater = searchMovieTheatersResult.data.shift();
                    if (movieTheater === undefined) {
                        throw new Error('施設が見つかりません');
                    }
                    forms.location = movieTheater;
                } else {
                    forms.location = undefined;
                }

                if (Array.isArray(event.videoFormat) && event.videoFormat.length > 0) {
                    const searchVideoFormatsResult = await categoryCodeService.search({
                        limit: 100,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType } },
                        codeValue: { $in: event.videoFormat.map((v) => v.typeOf) }
                    });
                    forms.videoFormat = searchVideoFormatsResult.data;
                } else {
                    forms.videoFormat = [];
                }
            }

            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchProductsResult = await productService.search({
                project: { id: { $eq: req.project.id } },
                typeOf: {
                    $in: [
                        chevre.factory.service.paymentService.PaymentServiceType.CreditCard,
                        chevre.factory.service.paymentService.PaymentServiceType.MovieTicket
                    ]
                }
            });

            res.render('events/screeningEventSeries/edit', {
                message: message,
                errors: errors,
                forms: forms,
                translationTypes,
                paymentServices: searchProductsResult.data,
                ...(movie !== undefined)
                    ? {
                        movie: {
                            ...movie,
                            // 多言語対応(2022-07-13~)
                            name: (typeof movie.name === 'string')
                                ? movie.name
                                : movie?.name?.ja
                        }
                    }
                    : undefined
            });
        } catch (error) {
            next(error);
        }
    }
);

screeningEventSeriesRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // validation
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEventSeries>({ id: req.params.id });
            await preDelete(req, event);

            await eventService.deleteById({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(req: Request, eventSeries: chevre.factory.event.screeningEventSeries.IEvent) {
    // validation
    const eventService = new chevre.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        superEvent: { ids: [eventSeries.id] }
    });
    if (searchEventsResult.data.length > 0) {
        throw new Error('関連するスケジュールが存在します');
    }
}

screeningEventSeriesRouter.get(
    '/:eventId/screeningEvents',
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const searchScreeningEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
                ...req.query,
                typeOf: chevre.factory.eventType.ScreeningEvent,
                superEvent: { ids: [req.params.eventId] }
            });

            res.json({
                data: searchScreeningEventsResult.data,
                // 使用する側ではスケジュールが存在するかどうかが知れれば十分
                totalCount: searchScreeningEventsResult.data.length
            });
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR)
                .json({ error: { message: error.message } });
        }
    }
);

/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createEventFromBody(
    req: Request,
    movieTheater: { id: string },
    isNew: boolean
): chevre.factory.event.screeningEventSeries.ICreateParams & chevre.service.IUnset {
    const movieIdentifier = String(req.body.workPerformed?.identifier);

    let videoFormat: chevre.factory.event.screeningEventSeries.IVideoFormat[] = [];

    if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
        const selectedVideoFormats = (<any[]>req.body.videoFormat).map((v) => JSON.parse(v));

        videoFormat = selectedVideoFormats.map((v) => {
            return { typeOf: v.codeValue, name: v.codeValue };
        });
    }

    const soundFormat = (Array.isArray(req.body.soundFormatType)) ? req.body.soundFormatType.map((f: string) => {
        return { typeOf: f, name: f };
    }) : [];

    let unacceptedPaymentMethod: string[] | undefined = req.body.unacceptedPaymentMethod;
    if (typeof unacceptedPaymentMethod === 'string') {
        unacceptedPaymentMethod = [unacceptedPaymentMethod];
    }

    const offers: chevre.factory.event.screeningEventSeries.IOffer = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.offerType.Offer,
        priceCurrency: chevre.factory.priceCurrency.JPY,
        ...(Array.isArray(unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: unacceptedPaymentMethod } : undefined
    };

    let subtitleLanguage: chevre.factory.language.ILanguage | undefined;
    if (req.body.translationType === TranslationTypeCode.Subtitle) {
        subtitleLanguage = { typeOf: 'Language', name: 'Japanese' };
    }

    let dubLanguage: chevre.factory.language.ILanguage | undefined;
    if (req.body.translationType === TranslationTypeCode.Dubbing) {
        dubLanguage = { typeOf: 'Language', name: 'Japanese' };
    }

    let description: chevre.factory.multilingualString | undefined;
    const descriptionJa = req.body.description?.ja;
    const descriptionEn = req.body.description?.en;
    if ((typeof descriptionJa === 'string' && descriptionJa.length > 0)
        || (typeof descriptionEn === 'string' && descriptionEn.length > 0)) {
        description = {
            ...(typeof descriptionEn === 'string' && descriptionEn.length > 0) ? { en: descriptionEn } : undefined,
            ...(typeof descriptionJa === 'string' && descriptionJa.length > 0) ? { ja: descriptionJa } : undefined
        };
    }

    let headline: chevre.factory.multilingualString | undefined;
    const headlineJa = req.body.headline?.ja;
    const headlineEn = req.body.headline?.en;
    if ((typeof headlineJa === 'string' && headlineJa.length > 0)
        || (typeof headlineEn === 'string' && headlineEn.length > 0)) {
        headline = {
            ...(typeof headlineEn === 'string' && headlineEn.length > 0) ? { en: headlineEn } : undefined,
            ...(typeof headlineJa === 'string' && headlineJa.length > 0) ? { ja: headlineJa } : undefined
        };
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.eventType.ScreeningEventSeries,
        name: {
            ja: req.body.nameJa,
            ...(typeof req.body.nameEn === 'string' && req.body.nameEn.length > 0) ? { en: req.body.nameEn } : undefined
        },
        kanaName: req.body.kanaName,
        // 最適化(2022-10-01~)
        location: {
            id: movieTheater.id
        },
        videoFormat: videoFormat,
        soundFormat: soundFormat,
        // 最適化(2022-10-01~)
        // workPerformed: workPerformed,
        workPerformed: { identifier: movieIdentifier },
        startDate: (typeof req.body.startDate === 'string' && req.body.startDate.length > 0)
            ? moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate()
            : undefined,
        endDate: (typeof req.body.endDate === 'string' && req.body.endDate.length > 0)
            ? moment(`${req.body.endDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .add(1, 'day')
                .toDate()
            : undefined,
        eventStatus: chevre.factory.eventStatusType.EventScheduled,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        offers,
        ...(subtitleLanguage !== undefined) ? { subtitleLanguage } : undefined,
        ...(dubLanguage !== undefined) ? { dubLanguage } : undefined,
        ...(headline !== undefined) ? { headline } : undefined,
        ...(description !== undefined) ? { description } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(subtitleLanguage === undefined) ? { subtitleLanguage: 1 } : undefined,
                    ...(dubLanguage === undefined) ? { dubLanguage: 1 } : undefined,
                    ...(headline === undefined) ? { headline: 1 } : undefined,
                    ...(description === undefined) ? { description: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        body('location')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        body('workPerformed.identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コンテンツ'))
            .isString(),
        body('startDate')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '開始日'))
            .isString(),
        body('endDate')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '終了日'))
            .isString(),
        body('nameJa')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        body('nameEn')
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME))
            .isString(),
        body('kanaName')
            .optional()
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称カナ', NAME_MAX_LENGTH_NAME))
            .isString(),
        body(['headline.ja', 'headline.en'])
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_NAME))
            .isString(),
        body(['description.ja', 'description.en'])
            .isLength({ max: NAME_MAX_LENGTH_DESCRIPTION })
            .withMessage(Message.Common.getMaxLength('補足説明', NAME_MAX_LENGTH_DESCRIPTION))
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
            .isLength({ min: 8 })
            .withMessage('8文字以上で入力してください')
    ];
}

export { screeningEventSeriesRouter };
