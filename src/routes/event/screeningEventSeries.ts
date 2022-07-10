/**
 * 施設コンテンツ管理ルーター
 */
import { chevre } from '@cinerino/sdk';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';

import { TranslationTypeCode, translationTypes } from '../../factory/translationType';

import * as Message from '../../message';

const debug = createDebug('chevre-backend:routes');

export const DEFAULT_PAYMENT_METHOD_TYPE_FOR_MOVIE_TICKET = 'MovieTicket';

const NUM_ADDITIONAL_PROPERTY = 10;

// コード 半角64
const NAME_MAX_LENGTH_CODE: number = 64;
// 名称・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA: number = 64;

const screeningEventSeriesRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all<ParamsDictionary>(
    '/add',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
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

        let message = '';
        let errors: any = {};
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    const searchMovieResult = await creativeWorkService.searchMovies({
                        project: { id: { $eq: req.project.id } },
                        identifier: { $eq: req.body.workPerformed?.identifier }
                    });
                    const movie = searchMovieResult.data.shift();
                    if (movie === undefined) {
                        throw new Error(`Movie ${req.body.workPerformed?.identifier} Not Found`);
                    }

                    const selectedLocation = JSON.parse(req.body.location);
                    const movieTheater = await placeService.findMovieTheaterById({ id: selectedLocation.id });
                    const attributes = createEventFromBody(req, movie, movieTheater, true);
                    debug('saving an event...', attributes);
                    const events = await eventService.create(attributes);
                    debug('event created', events[0]);
                    req.flash('message', '登録しました');
                    const redirect = `/projects/${req.project.id}/events/screeningEventSeries/${events[0].id}/update`;
                    debug('redirecting...', redirect);
                    res.redirect(redirect);

                    return;
                } catch (error) {
                    message = error.message;
                }
            } else {
                message = '入力に誤りがあります';
            }
        }

        const forms = {
            additionalProperty: [],
            headline: {},
            workPerformed: {},
            videoFormatType: [],
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

        debug('errors:', errors);
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
    async (req, res) => {
        try {
            const eventService = new chevre.service.Event({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchVideoFormatTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType } }
            });
            const videoFormatTypes = searchVideoFormatTypesResult.data;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
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
                        videoFormatName = videoFormatTypes
                            .filter((category) => eventVideoFormatTypes.includes(category.codeValue))
                            .map((category) => (typeof category.name === 'string') ? category.name : category.name?.ja)
                            .join(' ');
                    }

                    return {
                        ...event,
                        videoFormatName
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
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const locationId = <string>req.query.locationId;
            const movieTheater = await placeService.findMovieTheaterById({ id: locationId });

            const branchCode = movieTheater.branchCode;
            const fromDate = <string | undefined>req.query.fromDate;
            const toDate = <string | undefined>req.query.toDate;
            if (branchCode === undefined) {
                throw new Error();
            }
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
                    branchCodes: [branchCode]
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
            const event = await eventService.findById<chevre.factory.eventType.ScreeningEventSeries>({
                id: eventId
            });

            let searchMovieResult = await creativeWorkService.searchMovies({
                project: { id: { $eq: req.project.id } },
                identifier: { $eq: event.workPerformed.identifier }
            });
            let movie = searchMovieResult.data.shift();
            if (movie === undefined) {
                throw new Error(`Movie ${event.workPerformed.identifier} Not Found`);
            }

            if (req.method === 'POST') {
                // バリデーション
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        searchMovieResult = await creativeWorkService.searchMovies({
                            project: { id: { $eq: req.project.id } },
                            identifier: { $eq: req.body.workPerformed.identifier }
                        });
                        movie = searchMovieResult.data.shift();
                        if (movie === undefined) {
                            throw new Error(`Movie ${req.body.workPerformed.identifier} Not Found`);
                        }

                        const selectedLocation = JSON.parse(req.body.location);
                        const movieTheater = await placeService.findMovieTheaterById({ id: selectedLocation.id });
                        const attributes = createEventFromBody(req, movie, movieTheater, false);
                        debug('saving an event...', attributes);
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
                    const movieTheater = await placeService.findMovieTheaterById({
                        id: event.location.id
                    });
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
                movie: movie,
                translationTypes,
                paymentServices: searchProductsResult.data
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
    movie: chevre.factory.creativeWork.movie.ICreativeWork,
    movieTheater: chevre.factory.place.movieTheater.IPlace,
    isNew: boolean
): chevre.factory.event.screeningEventSeries.IAttributes {
    let videoFormat: chevre.factory.event.screeningEventSeries.IVideoFormat[] = [];

    if (Array.isArray(req.body.videoFormat) && req.body.videoFormat.length > 0) {
        const selectedVideoFormats = (<any[]>req.body.videoFormat).map((v) => JSON.parse(v));

        videoFormat = selectedVideoFormats.map((v) => {
            return { typeOf: v.codeValue, name: v.codeValue };
        });
    }

    // videoFormat = (Array.isArray(req.body.videoFormatType)) ? req.body.videoFormatType.map((f: string) => {
    //     return { typeOf: f, name: f };
    // }) : [];

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

    if (typeof movie.duration !== 'string') {
        throw new Error('コンテンツの上映時間が未登録です');
    }

    let description: chevre.factory.multilingualString | undefined;
    if (typeof req.body.description === 'string' && req.body.description.length > 0) {
        description = { ja: req.body.description };
    }

    let headline: chevre.factory.multilingualString | undefined;
    if (typeof req.body.headline?.ja === 'string' && req.body.headline?.ja.length > 0) {
        headline = { ja: req.body.headline?.ja };
    }

    const workPerformed: chevre.factory.event.screeningEventSeries.IWorkPerformed = {
        project: movie.project,
        typeOf: movie.typeOf,
        id: movie.id,
        identifier: movie.identifier,
        // 多言語名称対応(2022-07-11~)
        name: (typeof movie.name === 'string')
            ? movie.name
            : {
                ...(typeof movie.name?.en === 'string') ? { en: movie.name.en } : undefined,
                ...(typeof movie.name?.ja === 'string') ? { ja: movie.name.ja } : undefined
            },
        ...(typeof movie.duration === 'string') ? { duration: movie.duration } : undefined
    };

    const duration: string | undefined = (typeof movie.duration === 'string') ? movie.duration : undefined;

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.eventType.ScreeningEventSeries,
        name: {
            ja: req.body.nameJa,
            ...(typeof req.body.nameEn === 'string' && req.body.nameEn.length > 0) ? { en: req.body.nameEn } : undefined
        },
        kanaName: req.body.kanaName,
        location: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            id: movieTheater.id,
            typeOf: <chevre.factory.placeType.MovieTheater>movieTheater.typeOf,
            branchCode: movieTheater.branchCode,
            name: movieTheater.name,
            kanaName: movieTheater.kanaName
        },
        videoFormat: videoFormat,
        soundFormat: soundFormat,
        workPerformed: workPerformed,
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
        offers: offers,
        ...(typeof duration === 'string') ? { duration } : undefined,
        ...(subtitleLanguage !== undefined) ? { subtitleLanguage } : undefined,
        ...(dubLanguage !== undefined) ? { dubLanguage } : undefined,
        ...(headline !== undefined) ? { headline } : undefined,
        ...(description !== undefined) ? { description } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(typeof duration !== 'string') ? { duration: 1 } : undefined,
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
        body('workPerformed.identifier', Message.Common.required.replace('$fieldName$', 'コード'))
            .notEmpty(),
        body('workPerformed.identifier', Message.Common.getMaxLength('コード', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_CODE }),
        body('nameJa', Message.Common.required.replace('$fieldName$', '名称'))
            .notEmpty(),
        body('nameJa', Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),

        body('kanaName', Message.Common.getMaxLength('名称カナ', NAME_MAX_LENGTH_NAME_JA))
            .optional()
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),

        // body('startDate')
        //     .isDate()
        //     .withMessage('日付を入力してください'),

        // body('endDate')
        //     .isDate()
        //     .withMessage('日付を入力してください'),

        body('headline.ja', Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })

        // body('videoFormatType', Message.Common.required.replace('$fieldName$', '上映方式'))
        //     .notEmpty()
    ];
}

export default screeningEventSeriesRouter;
