/**
 * 作品コントローラー
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as createDebug from 'debug';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { BAD_REQUEST, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';

import * as Message from '../../message';

const debug = createDebug('chevre-backend:routes');

const THUMBNAIL_URL_MAX_LENGTH = 256;

const ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH = (process.env.ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH !== undefined)
    ? Number(process.env.ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH)
    // tslint:disable-next-line:no-magic-numbers
    : 256;

const NUM_ADDITIONAL_PROPERTY = 5;

// 作品コード 半角64
const NAME_MAX_LENGTH_CODE: number = 64;
// 作品名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA: number = 64;
// 作品名・英語 半角128
// const NAME_MAX_LENGTH_NAME_EN: number = 128;
// 上映時間・数字10
const NAME_MAX_LENGTH_NAME_MINUTES: number = 10;

const movieRouter = Router();

movieRouter.all<any>(
    '/add',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const creativeWorkService = new chevre.service.CreativeWork({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = '';
                    let movie = await createFromBody(req, true);

                    const { data } = await creativeWorkService.searchMovies({
                        limit: 1,
                        project: { ids: [req.project.id] },
                        identifier: { $eq: movie.identifier }
                    });
                    if (data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    debug('saving an movie...', movie);
                    movie = await creativeWorkService.createMovie(movie);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/creativeWorks/movie/${movie.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
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
    async (req, res) => {
        try {
            const creativeWorkService = new chevre.service.CreativeWork({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const searchDistributorTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.DistributorType } }
            });
            const distributorTypes = searchDistributorTypesResult.data;

            const searchContentRatingTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType } }
            });
            const contentRatingTypes = searchContentRatingTypesResult.data;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await creativeWorkService.searchMovies({
                limit: limit,
                page: page,
                sort: { identifier: chevre.factory.sortType.Ascending },
                project: { ids: [req.project.id] },
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
                identifier: req.query.identifier,
                name: req.query.name,
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
                            .toDate()
                        : undefined,
                    availableThrough: (typeof req.query.availableThrough === 'string' && req.query.availableThrough.length > 0) ?
                        moment(`${req.query.availableThrough}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .toDate()
                        : undefined
                }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((d) => {
                    const distributorType = distributorTypes.find(
                        (category) => category.codeValue === (<any>d).distributor?.codeValue
                    );

                    const contentRatingName = contentRatingTypes.find((category) => category.codeValue === d.contentRating)?.name;

                    const thumbnailUrl: string = (typeof d.thumbnailUrl === 'string') ? d.thumbnailUrl : '$thumbnailUrl$';

                    return {
                        ...d,
                        ...(distributorType !== undefined) ? { distributorName: (<any>distributorType.name).ja } : undefined,
                        contentRatingName: (typeof contentRatingName === 'string') ? contentRatingName : contentRatingName?.ja,
                        thumbnailUrl
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
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        const creativeWorkService = new chevre.service.CreativeWork({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
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
                // 作品DB登録
                try {
                    req.body.id = req.params.id;
                    movie = await createFromBody(req, false);
                    debug('saving an movie...', movie);
                    await creativeWorkService.updateMovie(movie);
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
            ...movie,
            distribution: (movie.distributor !== undefined) ? movie.distributor.id : '',
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
                auth: req.user.authClient
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
        auth: req.user.authClient
    });

    const searchEventsResult = await eventService.search<chevre.factory.eventType.ScreeningEventSeries>({
        limit: 1,
        project: { ids: [req.project.id] },
        typeOf: chevre.factory.eventType.ScreeningEventSeries,
        workPerformed: {
            identifiers: [movie.identifier]
        }
    });
    if (searchEventsResult.data.length > 0) {
        throw new Error('関連する施設コンテンツが存在します');
    }
}

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createFromBody(req: Request, isNew: boolean): Promise<chevre.factory.creativeWork.movie.ICreativeWork> {
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
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

    const movie: chevre.factory.creativeWork.movie.ICreativeWork = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.creativeWorkType.Movie,
        id: req.body.id,
        identifier: req.body.identifier,
        name: req.body.name,
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
            .isLength({ max: NAME_MAX_LENGTH_CODE })
            .withMessage(Message.Common.getMaxLength('コード', NAME_MAX_LENGTH_CODE)),

        body('name', Message.Common.required.replace('$fieldName$', '名称'))
            .notEmpty(),
        body('name', Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),

        body('duration', Message.Common.getMaxLengthHalfByte('上映時間', NAME_MAX_LENGTH_NAME_MINUTES))
            .optional()
            .isNumeric()
            .isLength({ max: NAME_MAX_LENGTH_NAME_MINUTES }),

        body('headline', Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),

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
            .isLength({ max: ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH }),
        body('additionalProperty.*.value')
            .if((value: any) => String(value).length > 0)
            .isString()
            .isLength({ max: ADDITIONAL_PROPERTY_VALUE_MAX_LENGTH })

        // colName = '公開日';
        // body('datePublished')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));

        // colName = '興行終了予定日';
        // body('offers.availabilityEnds')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));
    ];
}

export default movieRouter;
