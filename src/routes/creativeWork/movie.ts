/**
 * コンテンツコントローラー
 */
import { chevre } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';

import { RESERVED_CODE_VALUES } from '../../factory/reservedCodeValues';
import * as Message from '../../message';

import { validateCsrfToken } from '../../middlewares/validateCsrfToken';

const THUMBNAIL_URL_MAX_LENGTH = 256;
const ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH = (process.env.ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH !== undefined)
    ? Number(process.env.ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH)
    // tslint:disable-next-line:no-magic-numbers
    : 256;
const NUM_ADDITIONAL_PROPERTY = 5;
// const NAME_MAX_LENGTH_CODE: number = 32;
const NAME_MAX_LENGTH_NAME: number = 64;
// 上映時間・数字10
const NAME_MAX_LENGTH_NAME_MINUTES: number = 10;

const movieRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
movieRouter.all<ParamsDictionary>(
    '/add',
    validateCsrfToken,
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};
        let csrfToken: string | undefined;

        const creativeWorkService = new chevre.service.CreativeWork({
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
                    req.body.id = '';
                    let movie = await createFromBody(req, true);

                    movie = await creativeWorkService.createMovie(movie);
                    // tslint:disable-next-line:no-dynamic-delete
                    delete (<Express.Session>req.session).csrfSecret;
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/creativeWorks/movie/${movie.id}/update`);

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
            // レイティングを保管
            if (typeof req.body.contentRating === 'string' && req.body.contentRating.length > 0) {
                forms.contentRating = JSON.parse(req.body.contentRating);
            } else {
                forms.contentRating = undefined;
            }

            // 配給を保管
            if (typeof req.body.distributor === 'string' && req.body.distributor.length > 0) {
                forms.distributor = JSON.parse(req.body.distributor);
            } else {
                forms.distributor = undefined;
            }
        }

        res.render('creativeWorks/movie/add', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

movieRouter.get(
    '',
    (__, res) => {
        res.render(
            'creativeWorks/movie/index',
            {}
        );
    }
);

movieRouter.get(
    '/getlist',
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res) => {
        try {
            const creativeWorkService = new chevre.service.CreativeWork({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const additionalPropertyElemMatchNameEq = req.query.additionalProperty?.$elemMatch?.name?.$eq;
            const { data } = await creativeWorkService.searchMovies({
                limit: limit,
                page: page,
                sort: {
                    identifier: (req.query.sortType === String(chevre.factory.sortType.Descending))
                        ? chevre.factory.sortType.Descending
                        : chevre.factory.sortType.Ascending
                },
                project: { id: { $eq: req.project.id } },
                contentRating: {
                    $eq: (typeof req.query.contentRating?.$eq === 'string' && req.query.contentRating.$eq.length > 0)
                        ? req.query.contentRating.$eq
                        : undefined
                },
                distributor: {
                    codeValue: {
                        $eq: (typeof req.query.distributor?.codeValue?.$eq === 'string' && req.query.distributor.codeValue.$eq.length > 0)
                            ? req.query.distributor.codeValue.$eq
                            : undefined
                    }
                },
                // 空文字対応(2022-07-11~)
                identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                    ? req.query.identifier
                    : undefined,
                // 空文字対応(2022-07-11~)
                name: (typeof req.query.name === 'string' && req.query.name.length > 0)
                    ? req.query.name
                    : undefined,
                datePublishedFrom: (typeof req.query.datePublishedFrom === 'string' && req.query.datePublishedFrom.length > 0)
                    ? moment(`${req.query.datePublishedFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                datePublishedThrough: (typeof req.query.datePublishedThrough === 'string' && req.query.datePublishedThrough.length > 0)
                    ? moment(`${req.query.datePublishedThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                        .toDate()
                    : undefined,
                offers: {
                    availableFrom: (typeof req.query.availableFrom === 'string' && req.query.availableFrom.length > 0)
                        ? moment(`${req.query.availableFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .add(1, 'second')
                            .toDate()
                        : undefined,
                    availableThrough: (typeof req.query.availableThrough === 'string' && req.query.availableThrough.length > 0) ?
                        moment(`${req.query.availableThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .toDate()
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
                results: data.map((d) => {
                    const thumbnailUrlStr: string = (typeof d.thumbnailUrl === 'string') ? d.thumbnailUrl : '#';
                    const name: string = (typeof d.name === 'string')
                        ? d.name
                        : (typeof d.name?.ja === 'string') ? d.name.ja : '';

                    const additionalPropertyMatched =
                        (typeof additionalPropertyElemMatchNameEq === 'string' && additionalPropertyElemMatchNameEq.length > 0)
                            ? d.additionalProperty?.find((p) => p.name === additionalPropertyElemMatchNameEq)
                            : undefined;

                    return {
                        ...d,
                        name,
                        names: d.name,
                        thumbnailUrlStr,
                        ...(additionalPropertyMatched !== undefined) ? { additionalPropertyMatched } : undefined
                    };
                })
            });
        } catch (error) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
movieRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        const creativeWorkService = new chevre.service.CreativeWork({
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
        let movie = await creativeWorkService.findMovieById({
            id: req.params.id
        });
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            console.error(errors);
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    movie = await createFromBody(req, false);
                    await creativeWorkService.updateMovie(movie);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const defaultName: chevre.factory.multilingualString | undefined = (typeof movie.name === 'string')
            ? { ja: movie.name }
            : movie.name;
        const forms = {
            additionalProperty: [],
            ...movie,
            distribution: (movie.distributor !== undefined) ? movie.distributor.id : '',
            name: defaultName,
            ...req.body,
            duration: (typeof req.body.duration !== 'string')
                ? (typeof movie.duration === 'string') ? moment.duration(movie.duration)
                    .asMinutes() : ''
                : req.body.duration,
            datePublished: (typeof req.body.datePublished !== 'string')
                ? (movie.datePublished !== undefined) ? moment(movie.datePublished)
                    .tz('Asia/Tokyo')
                    .format('YYYY/MM/DD') : ''
                : req.body.datePublished,
            offers: (typeof req.body.offers?.availabilityEnds !== 'string')
                ? (movie.offers !== undefined && movie.offers.availabilityEnds !== undefined)
                    ? {
                        availabilityEnds: moment(movie.offers.availabilityEnds)
                            .add(-1, 'day')
                            .tz('Asia/Tokyo')
                            .format('YYYY/MM/DD')
                    }
                    : undefined
                : req.body.offers
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.contentRating === 'string' && req.body.contentRating.length > 0) {
                forms.contentRating = JSON.parse(req.body.contentRating);
            } else {
                forms.contentRating = undefined;
            }

            // 配給を保管
            if (typeof req.body.distributor === 'string' && req.body.distributor.length > 0) {
                forms.distributor = JSON.parse(req.body.distributor);
            } else {
                forms.distributor = undefined;
            }
        } else {
            if (typeof movie.contentRating === 'string') {
                const searchContentRatingsResult = await categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType } },
                    codeValue: { $eq: movie.contentRating }
                });
                forms.contentRating = searchContentRatingsResult.data[0];
            } else {
                forms.contentRating = undefined;
            }

            if (typeof movie.distributor?.codeValue === 'string') {
                const searchDistributorTypesResult = await categoryCodeService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.DistributorType } },
                    codeValue: { $eq: movie.distributor.codeValue }
                });
                forms.distributor = searchDistributorTypesResult.data[0];
            } else {
                forms.distributor = undefined;
            }
        }

        res.render('creativeWorks/movie/edit', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

movieRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const creativeWorkService = new chevre.service.CreativeWork({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // validation
            const movie = await creativeWorkService.findMovieById({ id: req.params.id });
            await preDelete(req, movie);

            await creativeWorkService.deleteMovie({ id: req.params.id });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

async function preDelete(req: Request, movie: chevre.factory.creativeWork.movie.ICreativeWork) {
    // 施設コンテンツが存在するかどうか
    const eventService = new chevre.service.Event({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const searchEventSeriesResult = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEventSeries,
        workPerformed: {
            identifiers: [movie.identifier]
        }
    });
    if (searchEventSeriesResult.data.length > 0) {
        throw new Error('関連する施設コンテンツが存在します');
    }

    // イベントが存在するかどうか
    const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEvent>({
        limit: 1,
        project: { id: { $eq: req.project.id } },
        typeOf: chevre.factory.eventType.ScreeningEvent,
        superEvent: {
            workPerformedIdentifiers: [movie.identifier]
        }
    });
    if (searchEventsResult.data.length > 0) {
        throw new Error('関連するイベントが存在します');
    }
}

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createFromBody(
    req: Request,
    isNew: boolean
): Promise<chevre.factory.creativeWork.movie.ICreativeWork & chevre.service.IUnset> {
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    let contentRating: string | undefined;
    if (typeof req.body.contentRating === 'string' && req.body.contentRating.length > 0) {
        const selectedContenRating = JSON.parse(req.body.contentRating);
        contentRating = selectedContenRating.codeValue;
    }

    let duration: string | undefined;
    if (typeof req.body.duration === 'string' && req.body.duration.length > 0) {
        duration = moment.duration(Number(req.body.duration), 'm')
            .toISOString();
    }

    let headline: string | undefined;
    if (typeof req.body.headline === 'string' && req.body.headline.length > 0) {
        headline = req.body.headline;
    }

    let datePublished: Date | undefined;
    if (typeof req.body.datePublished === 'string' && req.body.datePublished.length > 0) {
        datePublished = moment(`${req.body.datePublished}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .toDate();
    }

    let availabilityEnds: Date | undefined;
    if (typeof req.body.offers?.availabilityEnds === 'string' && req.body.offers?.availabilityEnds.length > 0) {
        availabilityEnds = moment(`${req.body.offers?.availabilityEnds}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .add(1, 'day')
            .toDate();
    }

    const offers: chevre.factory.creativeWork.movie.IOffer = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.offerType.Offer,
        priceCurrency: chevre.factory.priceCurrency.JPY,
        ...(availabilityEnds !== undefined) ? { availabilityEnds } : undefined
    };

    let distributor: chevre.factory.creativeWork.movie.IDistributor | undefined;
    if (typeof req.body.distributor === 'string' && req.body.distributor.length > 0) {
        const selectedDistributor = JSON.parse(req.body.distributor);
        const searchDistributorTypesResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.DistributorType } },
            codeValue: { $eq: selectedDistributor.codeValue }
        });
        const distributorType = searchDistributorTypesResult.data.shift();
        if (distributorType === undefined) {
            throw new Error('配給区分が見つかりません');
        }

        distributor = {
            id: distributorType.id,
            codeValue: distributorType.codeValue,
            ...{
                // 互換性維持対応
                distributorType: distributorType.codeValue
            }
        };
    }

    const thumbnailUrl: string | undefined =
        (typeof req.body.thumbnailUrl === 'string' && req.body.thumbnailUrl.length > 0) ? req.body.thumbnailUrl : undefined;

    let movieName: chevre.factory.multilingualString;
    const nameEnFromBody = req.body.name?.en;
    movieName = {
        ja: String(req.body.name?.ja),
        ...(typeof nameEnFromBody === 'string' && nameEnFromBody.length > 0)
            ? { en: nameEnFromBody }
            : undefined
    };

    const movie: chevre.factory.creativeWork.movie.ICreativeWork = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.creativeWorkType.Movie,
        id: req.body.id,
        identifier: req.body.identifier,
        name: movieName,
        offers: offers,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        ...(contentRating !== undefined) ? { contentRating } : undefined,
        ...(duration !== undefined) ? { duration } : undefined,
        ...(headline !== undefined) ? { headline } : undefined,
        ...(datePublished !== undefined) ? { datePublished } : undefined,
        ...(distributor !== undefined) ? { distributor } : undefined,
        ...(typeof thumbnailUrl === 'string') ? { thumbnailUrl } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(contentRating === undefined) ? { contentRating: 1 } : undefined,
                    ...(duration === undefined) ? { duration: 1 } : undefined,
                    ...(headline === undefined) ? { headline: 1 } : undefined,
                    ...(datePublished === undefined) ? { datePublished: 1 } : undefined,
                    ...(distributor === undefined) ? { distributor: 1 } : undefined,
                    ...(typeof thumbnailUrl !== 'string') ? { thumbnailUrl: 1 } : undefined
                }
            }
            : undefined
    };

    if (movie.offers !== undefined
        && movie.offers.availabilityEnds !== undefined
        && movie.datePublished !== undefined
        && movie.offers.availabilityEnds <= movie.datePublished) {
        throw new Error('興行終了予定日が公開日よりも前です');
    }

    return movie;
}

/**
 * コンテンツバリデーション
 */
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
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME)),
        body('name.en')
            .optional()
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME)),
        body('duration')
            .optional()
            .isNumeric()
            .isLength({ max: NAME_MAX_LENGTH_NAME_MINUTES })
            .withMessage(Message.Common.getMaxLength('上映時間', NAME_MAX_LENGTH_NAME_MINUTES)),
        body('headline')
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_NAME)),
        body('thumbnailUrl')
            .optional()
            .if((value: any) => typeof value === 'string' && value.length > 0)
            .isURL()
            .withMessage('URLを入力してください')
            .isLength({ max: THUMBNAIL_URL_MAX_LENGTH })
            .withMessage(Message.Common.getMaxLength('サムネイルURL', THUMBNAIL_URL_MAX_LENGTH)),
        body('additionalProperty.*.name')
            .optional()
            .if((value: any) => String(value).length > 0)
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください'),
        body('additionalProperty.*.value')
            .if((value: any) => String(value).length > 0)
            .isString()
            .isLength({ max: ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH })
    ];
}

export { movieRouter };
