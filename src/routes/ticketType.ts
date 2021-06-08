/**
 * 単価オファー管理ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { CREATED } from 'http-status';
import * as moment from 'moment-timezone';

import * as Message from '../message';

import { ProductType } from '../factory/productType';

import { searchApplications, SMART_THEATER_CLIENT_NEW, SMART_THEATER_CLIENT_OLD } from './offers';

const NUM_ADDITIONAL_PROPERTY = 10;

// 券種コード 半角64
const NAME_MAX_LENGTH_CODE = 30;
// 券種名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// 券種名・英語 半角128
const NAME_MAX_LENGTH_NAME_EN = 64;
// 金額
const CHAGE_MAX_LENGTH = 10;

const ticketTypeMasterRouter = Router();

// 券種登録
ticketTypeMasterRouter.all<any>(
    '/add',
    ...validateFormAdd(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const offerService = new chevre.service.Offer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.method === 'POST') {
            // 検証
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                // DB登録プロセス
                try {
                    req.body.id = '';
                    let ticketType = await createFromBody(req, true);

                    // コード重複確認
                    const { data } = await offerService.search({
                        project: { id: { $eq: req.project.id } },
                        identifier: { $eq: ticketType.identifier }
                    });
                    if (data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    ticketType = await offerService.create(ticketType);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/ticketTypes/${ticketType.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            name: {},
            alternateName: {},
            description: {},
            priceSpecification: {
                referenceQuantity: {
                    value: 1
                },
                accounting: {}
            },
            // isBoxTicket: (_.isEmpty(req.body.isBoxTicket)) ? '' : req.body.isBoxTicket,
            // isOnlineTicket: (_.isEmpty(req.body.isOnlineTicket)) ? '' : req.body.isOnlineTicket,
            seatReservationUnit: (typeof req.body.seatReservationUnit !== 'string' || req.body.seatReservationUnit.length === 0)
                ? 1
                : req.body.seatReservationUnit,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        // カテゴリーを検索
        if (req.method === 'POST') {
            // カテゴリーを保管
            if (typeof req.body.category === 'string' && req.body.category.length > 0) {
                forms.category = JSON.parse(req.body.category);
            } else {
                forms.category = undefined;
            }

            // 細目を保管
            if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
                forms.accounting = JSON.parse(req.body.accounting);
            } else {
                forms.accounting = undefined;
            }

            // 適用決済カードを保管
            if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
            } else {
                forms.appliesToMovieTicket = undefined;
            }

            // 適用通貨区分を保管
            if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0) {
                forms.eligibleMonetaryAmount = JSON.parse(req.body.eligibleMonetaryAmount);
            } else {
                forms.eligibleMonetaryAmount = undefined;
            }

            // 適用座席区分を保管
            if (typeof req.body.eligibleSeatingType === 'string' && req.body.eligibleSeatingType.length > 0) {
                forms.eligibleSeatingType = JSON.parse(req.body.eligibleSeatingType);
            } else {
                forms.eligibleSeatingType = undefined;
            }

            // 適用メンバーシップ区分を保管
            if (typeof req.body.eligibleMembershipType === 'string' && req.body.eligibleMembershipType.length > 0) {
                forms.eligibleMembershipType = JSON.parse(req.body.eligibleMembershipType);
            } else {
                forms.eligibleMembershipType = undefined;
            }

            // 適用サブ予約を保管
            if (typeof req.body.eligibleSubReservation === 'string' && req.body.eligibleSubReservation.length > 0) {
                forms.eligibleSubReservation = JSON.parse(req.body.eligibleSubReservation);
            } else {
                forms.eligibleSubReservation = undefined;
            }
        }

        const searchAddOnsResult = await productService.search({
            project: { id: { $eq: req.project.id } },
            typeOf: { $eq: ProductType.Product },
            ...{
                limit: 100
            }
        });

        const applications = await searchApplications(req);

        res.render('ticketType/add', {
            message: message,
            errors: errors,
            forms: forms,
            addOns: searchAddOnsResult.data,
            applications: applications.map((d) => d.member)
                .sort((a, b) => {
                    if (String(a.name) < String(b.name)) {
                        return -1;
                    }
                    if (String(a.name) > String(b.name)) {
                        return 1;
                    }

                    return 0;
                })
        });
    }
);

// 券種編集
// tslint:disable-next-line:use-default-type-parameter
ticketTypeMasterRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validateFormAdd(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const offerService = new chevre.service.Offer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            let ticketType = await offerService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                // 検証
                if (validatorResult.isEmpty()) {
                    // 券種DB更新プロセス
                    try {
                        req.body.id = req.params.id;
                        ticketType = await createFromBody(req, false);
                        await offerService.update(ticketType);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            if (ticketType.priceSpecification === undefined) {
                throw new Error('ticketType.priceSpecification undefined');
            }

            // let isBoxTicket = false;
            // let isOnlineTicket = false;
            // switch (ticketType.availability) {
            //     case chevre.factory.itemAvailability.InStock:
            //         isBoxTicket = true;
            //         isOnlineTicket = true;
            //         break;
            //     case chevre.factory.itemAvailability.InStoreOnly:
            //         isBoxTicket = true;
            //         break;
            //     case chevre.factory.itemAvailability.OnlineOnly:
            //         isOnlineTicket = true;
            //         break;
            //     default:
            // }

            let seatReservationUnit = 1;
            if (ticketType.priceSpecification.referenceQuantity.value !== undefined) {
                seatReservationUnit = ticketType.priceSpecification.referenceQuantity.value;
            }

            const accountsReceivable = (ticketType.priceSpecification.accounting !== undefined)
                ? ticketType.priceSpecification.accounting.accountsReceivable
                : '';

            const forms = {
                additionalProperty: [],
                alternateName: {},
                priceSpecification: {
                    referenceQuantity: {}
                },
                ...ticketType,
                // category: (ticketType.category !== undefined) ? ticketType.category.codeValue : '',
                price: Math.floor(Number(ticketType.priceSpecification.price) / seatReservationUnit),
                accountsReceivable: Math.floor(Number(accountsReceivable) / seatReservationUnit),
                validFrom: (ticketType.validFrom !== undefined)
                    ? moment(ticketType.validFrom)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : '',
                validThrough: (ticketType.validThrough !== undefined)
                    ? moment(ticketType.validThrough)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD')
                    : '',
                ...req.body,
                // isBoxTicket: (_.isEmpty(req.body.isBoxTicket)) ? isBoxTicket : req.body.isBoxTicket,
                // isOnlineTicket: (_.isEmpty(req.body.isOnlineTicket)) ? isOnlineTicket : req.body.isOnlineTicket,
                seatReservationUnit: (typeof req.body.seatReservationUnit !== 'string' || req.body.seatReservationUnit.length === 0)
                    ? seatReservationUnit
                    : req.body.seatReservationUnit,
                accountTitle: (typeof req.body.accountTitle !== 'string' || req.body.accountTitle.length === 0)
                    ? ticketType.priceSpecification?.accounting?.operatingRevenue?.codeValue
                    : req.body.accountTitle
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }

            if (req.method === 'POST') {
                // カテゴリーを保管
                if (typeof req.body.category === 'string' && req.body.category.length > 0) {
                    forms.category = JSON.parse(req.body.category);
                } else {
                    forms.category = undefined;
                }

                // 細目を保管
                if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
                    forms.accounting = JSON.parse(req.body.accounting);
                } else {
                    forms.accounting = undefined;
                }

                // 適用決済カードを保管
                if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                    forms.appliesToMovieTicket = JSON.parse(req.body.appliesToMovieTicket);
                } else {
                    forms.appliesToMovieTicket = undefined;
                }

                // 適用通貨区分を保管
                if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0) {
                    forms.eligibleMonetaryAmount = JSON.parse(req.body.eligibleMonetaryAmount);
                } else {
                    forms.eligibleMonetaryAmount = undefined;
                }

                // 適用座席区分を保管
                if (typeof req.body.eligibleSeatingType === 'string' && req.body.eligibleSeatingType.length > 0) {
                    forms.eligibleSeatingType = JSON.parse(req.body.eligibleSeatingType);
                } else {
                    forms.eligibleSeatingType = undefined;
                }

                // 適用メンバーシップ区分を保管
                if (typeof req.body.eligibleMembershipType === 'string' && req.body.eligibleMembershipType.length > 0) {
                    forms.eligibleMembershipType = JSON.parse(req.body.eligibleMembershipType);
                } else {
                    forms.eligibleMembershipType = undefined;
                }

                // 適用サブ予約を保管
                if (typeof req.body.eligibleSubReservation === 'string' && req.body.eligibleSubReservation.length > 0) {
                    forms.eligibleSubReservation = JSON.parse(req.body.eligibleSubReservation);
                } else {
                    forms.eligibleSubReservation = undefined;
                }
            } else {
                // カテゴリーを検索
                if (typeof ticketType.category?.codeValue === 'string') {
                    const searchOfferCategoriesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
                        codeValue: { $eq: ticketType.category.codeValue }
                    });
                    forms.category = searchOfferCategoriesResult.data[0];
                }

                // 細目を検索
                if (typeof ticketType.priceSpecification?.accounting?.operatingRevenue?.codeValue === 'string') {
                    const searchAccountTitlesResult = await accountTitleService.search({
                        limit: 1,
                        project: { ids: [req.project.id] },
                        codeValue: { $eq: ticketType.priceSpecification.accounting.operatingRevenue?.codeValue }
                    });
                    forms.accounting = searchAccountTitlesResult.data[0];
                }

                // 適用決済カードを検索
                if (typeof ticketType.priceSpecification?.appliesToMovieTicket?.serviceType === 'string') {
                    const searchAppliesToMovieTicketsResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } },
                        codeValue: { $eq: ticketType.priceSpecification?.appliesToMovieTicket?.serviceType }
                    });
                    forms.appliesToMovieTicket = searchAppliesToMovieTicketsResult.data[0];
                }

                // 適用通貨区分を検索
                if (Array.isArray(ticketType.eligibleMonetaryAmount)
                    && typeof ticketType.eligibleMonetaryAmount[0]?.currency === 'string') {
                    const searchEligibleAccountTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.AccountType } },
                        codeValue: { $eq: ticketType.eligibleMonetaryAmount[0]?.currency }
                    });
                    forms.eligibleMonetaryAmount = searchEligibleAccountTypesResult.data[0];
                    forms.eligibleMonetaryAmountValue = ticketType.eligibleMonetaryAmount[0]?.value;
                } else {
                    forms.eligibleMonetaryAmount = undefined;
                    forms.eligibleMonetaryAmountValue = undefined;
                }

                // 適用座席区分を検索
                if (Array.isArray(ticketType.eligibleSeatingType)
                    && typeof ticketType.eligibleSeatingType[0]?.codeValue === 'string') {
                    const searcheEligibleSeatingTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } },
                        codeValue: { $eq: ticketType.eligibleSeatingType[0]?.codeValue }
                    });
                    forms.eligibleSeatingType = searcheEligibleSeatingTypesResult.data[0];
                } else {
                    forms.eligibleSeatingType = undefined;
                }

                // 適用メンバーシップ区分を検索
                if (Array.isArray(ticketType.eligibleMembershipType)
                    && typeof ticketType.eligibleMembershipType[0]?.codeValue === 'string') {
                    const searcheEligibleMembershipTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } },
                        codeValue: { $eq: ticketType.eligibleMembershipType[0]?.codeValue }
                    });
                    forms.eligibleMembershipType = searcheEligibleMembershipTypesResult.data[0];
                } else {
                    forms.eligibleMembershipType = undefined;
                }

                // 適用サブ予約を検索
                if (Array.isArray(ticketType.eligibleSubReservation)
                    && typeof ticketType.eligibleSubReservation[0]?.typeOfGood?.seatingType === 'string') {
                    const searcheEligibleSubReservationSeatingTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } },
                        codeValue: { $eq: ticketType.eligibleSubReservation[0].typeOfGood.seatingType }
                    });
                    forms.eligibleSubReservation = searcheEligibleSubReservationSeatingTypesResult.data[0];
                    forms.eligibleSubReservationAmount = ticketType.eligibleSubReservation[0].amountOfThisGood;
                } else {
                    forms.eligibleSubReservation = undefined;
                    forms.eligibleSubReservationAmount = undefined;
                }
            }

            const searchAddOnsResult = await productService.search({
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: ProductType.Product },
                ...{
                    limit: 100
                }
            });

            const applications = await searchApplications(req);

            res.render('ticketType/update', {
                message: message,
                errors: errors,
                forms: forms,
                addOns: searchAddOnsResult.data,
                applications: applications.map((d) => d.member)
                    .sort((a, b) => {
                        if (String(a.name) < String(b.name)) {
                            return -1;
                        }
                        if (String(a.name) > String(b.name)) {
                            return 1;
                        }

                        return 0;
                    })
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * COA券種インポート
 */
ticketTypeMasterRouter.post(
    '/importFromCOA',
    async (req, res, next) => {
        try {
            const placeService = new chevre.service.Place({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // インポート対象の施設ブランチコードを検索
            const { data } = await placeService.searchMovieTheaters({ limit: 100 });

            // タスク作成
            const taskAttributes = data.map((d) => {
                return {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    name: <chevre.factory.taskName.ImportOffersFromCOA>chevre.factory.taskName.ImportOffersFromCOA,
                    status: chevre.factory.taskStatus.Ready,
                    runsAt: new Date(),
                    remainingNumberOfTries: 1,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        theaterCode: d.branchCode
                    }
                };
            });
            const tasks = await Promise.all(taskAttributes.map(async (a) => {
                return taskService.create(a);
            }));

            res.status(CREATED)
                .json(tasks);
        } catch (error) {
            next(error);
        }
    }
);

// async function searchAllAccountTitles(req: Request): Promise<chevre.factory.accountTitle.IAccountTitle[]> {
//     const accountTitleService = new chevre.service.AccountTitle({
//         endpoint: <string>process.env.API_ENDPOINT,
//         auth: req.user.authClient
//     });

//     const limit = 100;
//     let page = 0;
//     let numData: number = limit;
//     const accountTitles: chevre.factory.accountTitle.IAccountTitle[] = [];
//     while (numData === limit) {
//         page += 1;
//         const searchAccountTitlesResult = await accountTitleService.search({
//             limit: limit,
//             page: page,
//             project: { ids: [req.project.id] }
//         });
//         numData = searchAccountTitlesResult.data.length;
//         accountTitles.push(...searchAccountTitlesResult.data);
//     }

//     return accountTitles;
// }

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createFromBody(req: Request, isNew: boolean): Promise<chevre.factory.offer.IUnitPriceOffer> {
    const productService = new chevre.service.Product({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    let offerCategory: chevre.factory.categoryCode.ICategoryCode | undefined;

    if (typeof req.body.category === 'string' && req.body.category.length > 0) {
        const selectedCategory = JSON.parse(req.body.category);
        const searchOfferCategoryTypesResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
            codeValue: { $eq: selectedCategory.codeValue }
        });
        if (searchOfferCategoryTypesResult.data.length === 0) {
            throw new Error('オファーカテゴリーが見つかりません');
        }
        offerCategory = searchOfferCategoryTypesResult.data[0];
    }

    const availableAddOn: chevre.factory.offer.IOffer[] = [];
    let addOnItemOfferedIds: string[] = req.body.addOn?.itemOffered?.id;
    if (typeof addOnItemOfferedIds === 'string') {
        addOnItemOfferedIds = [addOnItemOfferedIds];
    }
    if (Array.isArray(addOnItemOfferedIds)) {
        for (const addOnItemOfferedId of addOnItemOfferedIds) {
            const addOn = <chevre.factory.product.IProduct>await productService.findById({
                id: addOnItemOfferedId
            });
            if (addOn.hasOfferCatalog === undefined) {
                throw new Error(`アドオン '${addOn.productID}' にはカタログが登録されていません`);
            }

            availableAddOn.push({
                project: addOn.project,
                typeOf: chevre.factory.offerType.Offer,
                itemOffered: {
                    typeOf: addOn.typeOf,
                    id: addOn.id,
                    name: addOn.name
                },
                priceCurrency: chevre.factory.priceCurrency.JPY
            });
        }
    }

    const availability: chevre.factory.itemAvailability = chevre.factory.itemAvailability.InStock;

    // 利用可能なアプリケーション設定
    const availableAtOrFrom: { id: string }[] = [];
    const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
    if (Array.isArray(availableAtOrFromParams)) {
        availableAtOrFromParams.forEach((applicationId) => {
            if (typeof applicationId === 'string' && applicationId.length > 0) {
                availableAtOrFrom.push({ id: applicationId });
            }
        });
    } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
        availableAtOrFrom.push({ id: availableAtOrFromParams });
    }

    // スマシの新旧クライアント対応
    const availableClientIds = availableAtOrFrom.map((a) => a.id);
    if (typeof SMART_THEATER_CLIENT_OLD === 'string' && SMART_THEATER_CLIENT_OLD.length > 0
        && typeof SMART_THEATER_CLIENT_NEW === 'string' && SMART_THEATER_CLIENT_NEW.length > 0
    ) {
        const oldClientAvailable = availableClientIds.includes(SMART_THEATER_CLIENT_OLD);
        const newClientAvailable = availableClientIds.includes(SMART_THEATER_CLIENT_NEW);
        if (oldClientAvailable && !newClientAvailable) {
            availableAtOrFrom.push({ id: SMART_THEATER_CLIENT_NEW });
        }
    }

    const referenceQuantityValue: number = Number(req.body.seatReservationUnit);
    const referenceQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode.C62> = {
        typeOf: <'QuantitativeValue'>'QuantitativeValue',
        value: referenceQuantityValue,
        unitCode: chevre.factory.unitCode.C62
    };

    const eligibleQuantityMinValue: number | undefined = (req.body.priceSpecification !== undefined
        && req.body.priceSpecification.eligibleQuantity !== undefined
        && req.body.priceSpecification.eligibleQuantity.minValue !== undefined
        && req.body.priceSpecification.eligibleQuantity.minValue !== '')
        ? Number(req.body.priceSpecification.eligibleQuantity.minValue)
        : undefined;
    const eligibleQuantityMaxValue: number | undefined = (req.body.priceSpecification !== undefined
        && req.body.priceSpecification.eligibleQuantity !== undefined
        && req.body.priceSpecification.eligibleQuantity.maxValue !== undefined
        && req.body.priceSpecification.eligibleQuantity.maxValue !== '')
        ? Number(req.body.priceSpecification.eligibleQuantity.maxValue)
        : undefined;
    const eligibleQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode.C62> | undefined =
        (eligibleQuantityMinValue !== undefined || eligibleQuantityMaxValue !== undefined)
            ? {
                typeOf: <'QuantitativeValue'>'QuantitativeValue',
                minValue: eligibleQuantityMinValue,
                maxValue: eligibleQuantityMaxValue,
                unitCode: chevre.factory.unitCode.C62
            }
            : undefined;

    const eligibleTransactionVolumePrice: number | undefined = (req.body.priceSpecification !== undefined
        && req.body.priceSpecification.eligibleTransactionVolume !== undefined
        && req.body.priceSpecification.eligibleTransactionVolume.price !== undefined
        && req.body.priceSpecification.eligibleTransactionVolume.price !== '')
        ? Number(req.body.priceSpecification.eligibleTransactionVolume.price)
        : undefined;
    // tslint:disable-next-line:max-line-length
    const eligibleTransactionVolume: chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType> | undefined =
        (eligibleTransactionVolumePrice !== undefined)
            ? {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: chevre.factory.priceSpecificationType.PriceSpecification,
                price: eligibleTransactionVolumePrice,
                priceCurrency: chevre.factory.priceCurrency.JPY,
                valueAddedTaxIncluded: true
            }
            : undefined;

    let appliesToMovieTicketType: string | undefined;
    let appliesToMovieTicketServiceOutputType: string | undefined;
    if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
        const selectedMovieTicketType = JSON.parse(req.body.appliesToMovieTicket);
        const searchMovieTicketTypesResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: selectedMovieTicketType.codeValue },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } }
        });
        const movieTicketType = searchMovieTicketTypesResult.data.shift();
        if (movieTicketType === undefined) {
            throw new Error('適用決済カード区分が見つかりません');
        }

        appliesToMovieTicketType = movieTicketType.codeValue;
        appliesToMovieTicketServiceOutputType = movieTicketType.paymentMethod?.typeOf;
    }

    // const eligibleCustomerType: string[] | undefined = (body.eligibleCustomerType !== undefined && body.eligibleCustomerType !== '')
    //     ? [body.eligibleCustomerType]
    //     : undefined;

    const accounting = {
        typeOf: <'Accounting'>'Accounting',
        operatingRevenue: <any>undefined,
        accountsReceivable: Number(req.body.accountsReceivable) * referenceQuantityValue
    };
    if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
        const selectedAccountTitle = JSON.parse(req.body.accounting);
        accounting.operatingRevenue = {
            typeOf: 'AccountTitle',
            codeValue: selectedAccountTitle.codeValue,
            identifier: selectedAccountTitle.codeValue,
            name: ''
        };
    }

    let nameFromJson: any = {};
    if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
        try {
            nameFromJson = JSON.parse(req.body.nameStr);
        } catch (error) {
            throw new Error(`高度な名称の型が不適切です ${error.message}`);
        }
    }

    // 適用座席区分があれば設定
    let eligibleSeatingTypes: chevre.factory.offer.IEligibleCategoryCode[] | undefined;
    if (typeof req.body.eligibleSeatingType === 'string' && req.body.eligibleSeatingType.length > 0) {
        const selectedSeatingType = JSON.parse(req.body.eligibleSeatingType);

        const searchSeatingTypeResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: selectedSeatingType.codeValue },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
        });
        const seatingType = searchSeatingTypeResult.data.shift();
        if (seatingType === undefined) {
            throw new Error(`Seating Type ${selectedSeatingType.codeValue} Not Found`);
        }

        eligibleSeatingTypes = [{
            project: seatingType.project,
            typeOf: seatingType.typeOf,
            id: seatingType.id,
            codeValue: seatingType.codeValue,
            inCodeSet: seatingType.inCodeSet
        }];
    }

    // 適用メンバーシップ区分があれば設定
    let eligibleMembershipTypes: chevre.factory.offer.IEligibleCategoryCode[] | undefined;
    if (typeof req.body.eligibleMembershipType === 'string' && req.body.eligibleMembershipType.length > 0) {
        const selectedMembershipType = JSON.parse(req.body.eligibleMembershipType);

        const searchMembershipTypeResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: selectedMembershipType.codeValue },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MembershipType } }
        });
        const membershipType = searchMembershipTypeResult.data.shift();
        if (membershipType === undefined) {
            throw new Error(`Membership Type ${selectedMembershipType.codeValue} Not Found`);
        }

        eligibleMembershipTypes = [{
            project: membershipType.project,
            typeOf: membershipType.typeOf,
            id: membershipType.id,
            codeValue: membershipType.codeValue,
            inCodeSet: membershipType.inCodeSet
        }];
    }

    // 適用口座があれば設定
    let eligibleMonetaryAmount: chevre.factory.offer.IEligibleMonetaryAmount[] | undefined;
    // if (Array.isArray(req.body.eligibleMonetaryAmount) && req.body.eligibleMonetaryAmount.length > 0
    //     && typeof req.body.eligibleMonetaryAmount[0].currency === 'string' && req.body.eligibleMonetaryAmount[0].currency.length > 0
    //     && typeof req.body.eligibleMonetaryAmount[0].value === 'string' && req.body.eligibleMonetaryAmount[0].value.length > 0) {
    //     eligibleMonetaryAmount = [{
    //         typeOf: 'MonetaryAmount',
    //         currency: req.body.eligibleMonetaryAmount[0].currency,
    //         value: Number(req.body.eligibleMonetaryAmount[0].value)
    //     }];
    // }
    if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0
        && typeof req.body.eligibleMonetaryAmountValue === 'string' && req.body.eligibleMonetaryAmountValue.length > 0) {
        const selectedAccountType = JSON.parse(req.body.eligibleMonetaryAmount);

        eligibleMonetaryAmount = [{
            typeOf: 'MonetaryAmount',
            currency: selectedAccountType.codeValue,
            value: Number(req.body.eligibleMonetaryAmountValue)
        }];
    }

    // 適用サブ予約条件があれば設定
    let eligibleSubReservation: chevre.factory.offer.IEligibleSubReservation[] | undefined;
    if (typeof req.body.eligibleSubReservation === 'string' && req.body.eligibleSubReservation.length > 0
        && typeof req.body.eligibleSubReservationAmount === 'string' && req.body.eligibleSubReservationAmount.length > 0) {
        const selectedSubReservationSeatingType = JSON.parse(req.body.eligibleSubReservation);

        const searchSeatingTypeResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: selectedSubReservationSeatingType.codeValue },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
        });
        const seatingType = searchSeatingTypeResult.data.shift();
        if (seatingType === undefined) {
            throw new Error(`Seating Type ${selectedSubReservationSeatingType.codeValue} Not Found`);
        }

        eligibleSubReservation = [{
            typeOfGood: {
                seatingType: seatingType.codeValue
            },
            amountOfThisGood: Number(req.body.eligibleSubReservationAmount)
        }];
    }

    let validFrom: Date | undefined;
    if (typeof req.body.validFrom === 'string' && req.body.validFrom.length > 0) {
        validFrom = moment(`${req.body.validFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .toDate();
        // validFrom = moment(req.body.validFrom)
        //     .toDate();
    }

    let validThrough: Date | undefined;
    if (typeof req.body.validThrough === 'string' && req.body.validThrough.length > 0) {
        validThrough = moment(`${req.body.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .toDate();
        // validThrough = moment(req.body.validThrough)
        //     .toDate();
    }

    const itemOffered = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: ProductType.EventService
    };

    let color: string = 'rgb(51, 51, 51)';
    if (typeof req.body.color === 'string' && req.body.color.length > 0) {
        color = req.body.color;
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: <chevre.factory.offerType>'Offer',
        priceCurrency: chevre.factory.priceCurrency.JPY,
        id: req.body.id,
        identifier: req.body.identifier,
        name: {
            ...nameFromJson,
            ja: req.body.name.ja,
            en: req.body.name.en
        },
        description: req.body.description,
        alternateName: { ja: <string>req.body.alternateName.ja, en: '' },
        availableAtOrFrom: availableAtOrFrom,
        availability: availability,
        itemOffered: itemOffered,
        // eligibleCustomerType: eligibleCustomerType,
        priceSpecification: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: chevre.factory.priceSpecificationType.UnitPriceSpecification,
            name: req.body.name,
            price: Number(req.body.price) * referenceQuantityValue,
            priceCurrency: chevre.factory.priceCurrency.JPY,
            valueAddedTaxIncluded: true,
            eligibleQuantity: eligibleQuantity,
            eligibleTransactionVolume: eligibleTransactionVolume,
            referenceQuantity: referenceQuantity,
            accounting: accounting,
            ...(typeof appliesToMovieTicketType === 'string' && appliesToMovieTicketType.length > 0)
                ? {
                    appliesToMovieTicket: {
                        typeOf: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                        serviceType: appliesToMovieTicketType,
                        serviceOutput: {
                            // とりあえず決済方法は固定でムビチケ
                            typeOf: (typeof appliesToMovieTicketServiceOutputType === 'string'
                                && appliesToMovieTicketServiceOutputType.length > 0)
                                ? appliesToMovieTicketServiceOutputType
                                : chevre.factory.paymentMethodType.MovieTicket
                        }
                    },
                    // 互換性維持対応
                    appliesToMovieTicketType: appliesToMovieTicketType
                }
                : undefined
        },
        addOn: availableAddOn,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        ...(typeof color === 'string')
            ? {
                color: color
            }
            : undefined,
        ...(offerCategory !== undefined)
            ? {
                category: {
                    project: offerCategory.project,
                    id: offerCategory.id,
                    codeValue: offerCategory.codeValue
                }
            }
            : undefined,
        ...(Array.isArray(eligibleSeatingTypes))
            ? {
                eligibleSeatingType: eligibleSeatingTypes
            }
            : undefined,
        ...(Array.isArray(eligibleMembershipTypes))
            ? {
                eligibleMembershipType: eligibleMembershipTypes
            }
            : undefined,
        ...(eligibleMonetaryAmount !== undefined)
            ? {
                eligibleMonetaryAmount: eligibleMonetaryAmount
            }
            : undefined,
        ...(eligibleSubReservation !== undefined)
            ? {
                eligibleSubReservation: eligibleSubReservation
            }
            : undefined,
        ...(validFrom instanceof Date)
            ? {
                validFrom: validFrom
            }
            : undefined,
        ...(validThrough instanceof Date)
            ? {
                validThrough: validThrough
            }
            : undefined,
        ...(!isNew)
            // ...{
            //     $unset: { eligibleCustomerType: 1 }
            // },
            ? {
                $unset: {
                    ...(typeof color !== 'string') ? { color: 1 } : undefined,
                    ...(offerCategory === undefined) ? { category: 1 } : undefined,
                    ...(eligibleSeatingTypes === undefined) ? { eligibleSeatingType: 1 } : undefined,
                    ...(eligibleMembershipTypes === undefined) ? { eligibleMembershipType: 1 } : undefined,
                    ...(eligibleMonetaryAmount === undefined) ? { eligibleMonetaryAmount: 1 } : undefined,
                    ...(eligibleSubReservation === undefined) ? { eligibleSubReservation: 1 } : undefined,
                    ...(validFrom === undefined) ? { validFrom: 1 } : undefined,
                    ...(validThrough === undefined) ? { validThrough: 1 } : undefined
                }
            }
            : undefined
    };
}

/**
 * 券種マスタ新規登録画面検証
 */
function validateFormAdd() {
    return [
        body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            // .isAlphanumeric()
            .matches(/^[0-9a-zA-Z\-_]+$/)
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', 30)),

        // 名称
        body('name.ja', Message.Common.required.replace('$fieldName$', '名称'))
            .notEmpty(),
        body('name.ja', Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        // 英語名称
        body('name.en', Message.Common.required.replace('$fieldName$', '英語名称'))
            .notEmpty(),
        body('name.en', Message.Common.getMaxLength('英語名称', NAME_MAX_LENGTH_NAME_EN))
            .isLength({ max: NAME_MAX_LENGTH_NAME_EN }),
        body('alternateName.ja', Message.Common.required.replace('$fieldName$', '代替名称'))
            .notEmpty(),
        body('alternateName.ja', Message.Common.getMaxLength('代替名称', NAME_MAX_LENGTH_NAME_JA))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),

        // 購入席単位追加
        body('seatReservationUnit', Message.Common.required.replace('$fieldName$', '購入席単位追加'))
            .notEmpty(),

        body('price')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '発生金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLengthHalfByte('発生金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('accountsReceivable')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '売上金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLengthHalfByte('売上金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('eligibleMonetaryAmountValue')
            .optional()
            .if((value: any) => typeof value === 'string' && value.length > 0)
            .isNumeric()
            .withMessage('数値を入力してください')
            .isLength({ max: 10 })
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('eligibleSubReservationAmount')
            .optional()
            .if((value: any) => typeof value === 'string' && value.length > 0)
            .isNumeric()
            .withMessage('数値を入力してください')
            .isLength({ max: 10 })
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')
    ];
}

export default ticketTypeMasterRouter;
