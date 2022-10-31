/**
 * 単価オファー管理ルーター
 */
import { chevre, factory } from '@cinerino/sdk';
import * as Tokens from 'csrf';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { CREATED } from 'http-status';
import * as moment from 'moment-timezone';

import * as Message from '../message';

import { ProductType, productTypes } from '../factory/productType';

import { searchApplications, SMART_THEATER_CLIENT_NEW, SMART_THEATER_CLIENT_OLD } from './offers';

import { validateCsrfToken } from '../middlewares/validateCsrfToken';

const NUM_ADDITIONAL_PROPERTY = 10;
const NAME_MAX_LENGTH_CODE = 30;
const NAME_MAX_LENGTH_NAME_JA = 64;
const NAME_MAX_LENGTH_NAME_EN = 64;
// 金額
const CHAGE_MAX_LENGTH = 10;
const MAX_NUM_OFFER_APPLIES_TO_MOVIE_TICKET = (typeof process.env.MAX_NUM_OFFER_APPLIES_TO_MOVIE_TICKET === 'string')
    ? Number(process.env.MAX_NUM_OFFER_APPLIES_TO_MOVIE_TICKET)
    : 1;

const ticketTypeMasterRouter = Router();

// 興行オファー作成
// tslint:disable-next-line:use-default-type-parameter
ticketTypeMasterRouter.all<ParamsDictionary>(
    '/add',
    validateCsrfToken,
    ...validateFormAdd(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};
        let csrfToken: string | undefined;

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

                    ticketType = await offerService.create(ticketType);
                    // tslint:disable-next-line:no-dynamic-delete
                    delete (<Express.Session>req.session).csrfSecret;
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/ticketTypes/${ticketType.id}/update`);

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
            alternateName: {},
            description: {},
            itemOffered: { typeOf: ProductType.EventService },
            priceSpecification: {
                referenceQuantity: {
                    value: 1
                },
                accounting: {}
            },
            seatReservationUnit: (typeof req.body.seatReservationUnit !== 'string' || req.body.seatReservationUnit.length === 0)
                ? 1
                : req.body.seatReservationUnit,
            ...(typeof csrfToken === 'string') ? { csrfToken } : undefined,
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

            // 利用可能アプリケーションを保管
            const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
            if (Array.isArray(availableAtOrFromParams)) {
                forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                    return { id: applicationId };
                });
            } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
                forms.availableAtOrFrom = { id: availableAtOrFromParams };
            }

            // アドオンを保管
            let addOnItemOfferedIds: string[] = req.body.addOn?.itemOffered?.id;
            if (typeof addOnItemOfferedIds === 'string') {
                addOnItemOfferedIds = [addOnItemOfferedIds];
            }
            if (Array.isArray(addOnItemOfferedIds)) {
                forms.addOn = addOnItemOfferedIds.map((addOnItemOfferedId) => {
                    return {
                        typeOf: chevre.factory.offerType.Offer,
                        itemOffered: {
                            id: addOnItemOfferedId
                        }
                    };
                });
            }

            // 適用決済カードを保管
            if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                forms.appliesToMovieTicket = [JSON.parse(req.body.appliesToMovieTicket)];
            } else if (Array.isArray(req.body.appliesToMovieTicket)) {
                forms.appliesToMovieTicket = req.body.appliesToMovieTicket.map((appliesToMovieTicket: any) => {
                    return JSON.parse(String(appliesToMovieTicket));
                });
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

            // ポイント特典を保管
            if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0) {
                forms.pointAwardCurrecy = JSON.parse(req.body.pointAwardCurrecy);
            } else {
                forms.pointAwardCurrecy = undefined;
            }

            // 返品ポリシーを保管
            if (Array.isArray(req.body.hasMerchantReturnPolicy)) {
                forms.hasMerchantReturnPolicy = req.body.hasMerchantReturnPolicy.map((returnPolicy: any) => {
                    return JSON.parse(String(returnPolicy));
                });
            } else {
                forms.hasMerchantReturnPolicy = undefined;
            }
        }

        const searchAddOnsResult = await productService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            typeOf: { $eq: ProductType.Product }
        });

        const applications = await searchApplications(req);

        res.render('ticketType/add', {
            message: message,
            errors: errors,
            forms: forms,
            addOns: searchAddOnsResult.data,
            productTypes: productTypes,
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

// 興行オファー編集
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
        const merchantReturnPolicyService = new chevre.service.MerchantReturnPolicy({
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

            let seatReservationUnit = 1;
            if (typeof ticketType.priceSpecification.referenceQuantity.value === 'number') {
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

                // 利用可能アプリケーションを保管
                const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
                if (Array.isArray(availableAtOrFromParams)) {
                    forms.availableAtOrFrom = availableAtOrFromParams.map((applicationId) => {
                        return { id: applicationId };
                    });
                } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
                    forms.availableAtOrFrom = { id: availableAtOrFromParams };
                }

                // アドオンを保管
                let addOnItemOfferedIds: string[] = req.body.addOn?.itemOffered?.id;
                if (typeof addOnItemOfferedIds === 'string') {
                    addOnItemOfferedIds = [addOnItemOfferedIds];
                }
                if (Array.isArray(addOnItemOfferedIds)) {
                    forms.addOn = addOnItemOfferedIds.map((addOnItemOfferedId) => {
                        return {
                            typeOf: chevre.factory.offerType.Offer,
                            itemOffered: {
                                id: addOnItemOfferedId
                            }
                        };
                    });
                }

                // 適用決済カードを保管
                if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
                    forms.appliesToMovieTicket = [JSON.parse(req.body.appliesToMovieTicket)];
                } else if (Array.isArray(req.body.appliesToMovieTicket)) {
                    forms.appliesToMovieTicket = req.body.appliesToMovieTicket.map((appliesToMovieTicket: any) => {
                        return JSON.parse(String(appliesToMovieTicket));
                    });
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

                // ポイント特典を保管
                if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0) {
                    forms.pointAwardCurrecy = JSON.parse(req.body.pointAwardCurrecy);
                } else {
                    forms.pointAwardCurrecy = undefined;
                }

                // 返品ポリシーを保管
                if (Array.isArray(req.body.hasMerchantReturnPolicy)) {
                    forms.hasMerchantReturnPolicy = req.body.hasMerchantReturnPolicy.map((returnPolicy: any) => {
                        return JSON.parse(String(returnPolicy));
                    });
                } else {
                    forms.hasMerchantReturnPolicy = undefined;
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
                        project: { id: { $eq: req.project.id } },
                        codeValue: { $eq: ticketType.priceSpecification.accounting.operatingRevenue?.codeValue }
                    });
                    forms.accounting = searchAccountTitlesResult.data[0];
                }

                // 適用決済カードを検索
                const offerAppliesToMovieTickets = ticketType.priceSpecification?.appliesToMovieTicket;
                if (Array.isArray(offerAppliesToMovieTickets)) {
                    if (offerAppliesToMovieTickets.length > 0) {
                        // 複数対応
                        forms.appliesToMovieTicket = [];
                        for (const offerAppliesToMovieTicket of offerAppliesToMovieTickets) {
                            const searchAppliesToMovieTicketsResult = await categoryCodeService.search({
                                limit: 1,
                                project: { id: { $eq: req.project.id } },
                                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType } },
                                codeValue: { $eq: offerAppliesToMovieTicket.serviceType }
                            });
                            // formに必要な属性に最適化(2022-07-21~)
                            const movieTicketType = searchAppliesToMovieTicketsResult.data[0];
                            forms.appliesToMovieTicket.push({
                                codeValue: movieTicketType.codeValue,
                                name: movieTicketType.name,
                                paymentMethod: movieTicketType.paymentMethod
                            });
                        }
                        // forms.appliesToMovieTicket = [{
                        //     codeValue: movieTicketType.codeValue,
                        //     name: movieTicketType.name,
                        //     paymentMethod: movieTicketType.paymentMethod
                        // }];
                    }
                } else {
                    // Arrayでないケースは廃止(2022-09-10~)
                    // if (typeof offerAppliesToMovieTickets?.serviceType === 'string') {
                    //     // サポート終了(2022-08-03~)
                    //     throw new Error('適用決済カード区分の型が不適切です');
                    // }
                }

                // 適用通貨区分を検索
                if (Array.isArray(ticketType.eligibleMonetaryAmount)
                    && typeof ticketType.eligibleMonetaryAmount[0]?.currency === 'string') {
                    const searchEligibleCurrencyTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                        codeValue: { $eq: ticketType.eligibleMonetaryAmount[0]?.currency }
                    });
                    forms.eligibleMonetaryAmount = searchEligibleCurrencyTypesResult.data[0];
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

                // ポイント特典を検索
                if (typeof ticketType.itemOffered?.pointAward?.amount?.currency === 'string') {
                    const searchEligibleCurrencyTypesResult = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType } },
                        codeValue: { $eq: ticketType.itemOffered.pointAward.amount.currency }
                    });
                    forms.pointAwardCurrecy = searchEligibleCurrencyTypesResult.data[0];
                    forms.pointAwardValue = ticketType.itemOffered.pointAward.amount.value;
                } else {
                    forms.pointAwardCurrecy = undefined;
                    forms.pointAwardValue = undefined;
                }

                // 返品ポリシーを検索
                const hasMerchantReturnPolicy = ticketType.hasMerchantReturnPolicy;
                if (Array.isArray(hasMerchantReturnPolicy)) {
                    if (hasMerchantReturnPolicy.length > 0) {
                        forms.hasMerchantReturnPolicy = [];
                        for (const returnPolicy of hasMerchantReturnPolicy) {
                            const searchReturnPoliciesResult = await merchantReturnPolicyService.search({
                                limit: 1,
                                id: { $eq: String(returnPolicy.id) }
                            });
                            const existingReturnPolicy = searchReturnPoliciesResult.data[0];
                            // formに必要な属性に最適化
                            forms.hasMerchantReturnPolicy.push({
                                id: existingReturnPolicy.id,
                                identifier: existingReturnPolicy.identifier,
                                name: { ja: existingReturnPolicy.name?.ja }
                            });
                        }
                    }
                }
            }

            const searchAddOnsResult = await productService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: ProductType.Product }
            });

            const applications = await searchApplications(req);

            res.render('ticketType/update', {
                message: message,
                errors: errors,
                forms: forms,
                addOns: searchAddOnsResult.data,
                productTypes: productTypes,
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
 * COAオファーインポート
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

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
export async function createFromBody(
    req: Request,
    isNew: boolean
): Promise<chevre.factory.unitPriceOffer.IUnitPriceOffer & chevre.service.IUnset> {
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
    const merchantReturnPolicyService = new chevre.service.MerchantReturnPolicy({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });

    let itemOffered: chevre.factory.unitPriceOffer.IItemOffered;
    const itemOfferedTypeOf = req.body.itemOffered?.typeOf;
    switch (itemOfferedTypeOf) {
        case ProductType.EventService:
        case ProductType.PaymentCard:
        case ProductType.Product:
        case ProductType.MembershipService:
            itemOffered = {
                typeOf: itemOfferedTypeOf,
                serviceOutput: {
                }
            };
            break;

        default:
            throw new Error(`${req.body.itemOffered?.typeOf} not implemented`);
    }

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

    const availability: chevre.factory.itemAvailability = chevre.factory.itemAvailability.InStock;

    const availableAddOn: chevre.factory.unitPriceOffer.IAddOn4unitPriceOffer[] = [];
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

    // 利用可能なアプリケーション設定
    const availableAtOrFrom: chevre.factory.offer.IAvailableAtOrFrom[] = [];
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

    let referenceQuantityValue: number | chevre.factory.quantitativeValue.StringValue.Infinity;
    let referenceQuantityUnitCode: chevre.factory.unitCode;

    if (itemOffered.typeOf === chevre.factory.product.ProductType.EventService) {
        referenceQuantityValue = Number(req.body.seatReservationUnit);
        referenceQuantityUnitCode = chevre.factory.unitCode.C62;
    } else {
        referenceQuantityValue =
            (req.body.priceSpecification.referenceQuantity.value === chevre.factory.quantitativeValue.StringValue.Infinity)
                ? chevre.factory.quantitativeValue.StringValue.Infinity
                : Number(req.body.priceSpecification.referenceQuantity.value);
        referenceQuantityUnitCode = <chevre.factory.unitCode>req.body.priceSpecification.referenceQuantity.unitCode;
    }

    const referenceQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode> = {
        typeOf: 'QuantitativeValue',
        value: referenceQuantityValue,
        unitCode: referenceQuantityUnitCode
    };

    // プロダクトオファーの場合referenceQuantityValueを検証
    if (itemOffered.typeOf !== chevre.factory.product.ProductType.EventService) {
        if (typeof referenceQuantityValue === 'number') {
            // 最大1年まで
            const MAX_REFERENCE_QUANTITY_VALUE_IN_SECONDS = 31536000;
            let referenceQuantityValueInSeconds = referenceQuantityValue;
            switch (referenceQuantityUnitCode) {
                case chevre.factory.unitCode.Ann:
                    // tslint:disable-next-line:no-magic-numbers
                    referenceQuantityValueInSeconds = referenceQuantityValue * 31536000;
                    break;
                case chevre.factory.unitCode.Day:
                    // tslint:disable-next-line:no-magic-numbers
                    referenceQuantityValueInSeconds = referenceQuantityValue * 86400;
                    break;
                case chevre.factory.unitCode.Sec:
                    break;
                case chevre.factory.unitCode.C62:
                    // C62の場合、単価単位期間制限は実質無効
                    referenceQuantityValueInSeconds = 0;
                    break;
                default:
                    throw new Error(`${referenceQuantity.unitCode} not implemented`);
            }
            if (referenceQuantityValueInSeconds > MAX_REFERENCE_QUANTITY_VALUE_IN_SECONDS) {
                throw new Error('単価単位期間は最大で1年です');
            }
        } else if (referenceQuantityValue === chevre.factory.quantitativeValue.StringValue.Infinity) {
            if (itemOffered.typeOf !== chevre.factory.product.ProductType.PaymentCard) {
                throw new Error('適用数が不適切です');
            }
        } else {
            throw new Error('適用数が不適切です');
        }
    }

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

    // let appliesToMovieTicketType: string | undefined;
    // let appliesToMovieTicketServiceOutputType: string | undefined;
    const appliesToMovieTicket: {
        codeValue: string;
        serviceOutputType: string;
    }[] = [];
    // multiple selectで一つ選択の場合、typeof req.body.appliesToMovieTicket === 'string'なので、配列に置換
    if (typeof req.body.appliesToMovieTicket === 'string' && req.body.appliesToMovieTicket.length > 0) {
        req.body.appliesToMovieTicket = [req.body.appliesToMovieTicket];
    }
    if (Array.isArray(req.body.appliesToMovieTicket) && req.body.appliesToMovieTicket.length > MAX_NUM_OFFER_APPLIES_TO_MOVIE_TICKET) {
        throw new Error(`選択可能な適用決済カード区分は${MAX_NUM_OFFER_APPLIES_TO_MOVIE_TICKET}つまでです`);
    }
    if (Array.isArray(req.body.appliesToMovieTicket)) {
        await Promise.all(req.body.appliesToMovieTicket.map(async (a: any) => {
            const selectedMovieTicketType = JSON.parse(String(a));
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

            // appliesToMovieTicketType = movieTicketType.codeValue;
            // appliesToMovieTicketServiceOutputType = movieTicketType.paymentMethod?.typeOf;
            appliesToMovieTicket.push({
                codeValue: movieTicketType.codeValue,
                serviceOutputType: String(movieTicketType.paymentMethod?.typeOf)
            });
        }));
    }

    // 複数適用決済カード区分における決済方法重複は不可
    if (appliesToMovieTicket.length > 0) {
        const appliesToMovieTicketServiceOutputTypeOfs = [...new Set(appliesToMovieTicket.map((a) => a.serviceOutputType))];
        if (appliesToMovieTicketServiceOutputTypeOfs.length !== appliesToMovieTicket.length) {
            throw new Error('適用決済カード区分の決済方法が重複しています');
        }
    }

    const accounting: chevre.factory.priceSpecification.IAccounting = {
        typeOf: 'Accounting',
        accountsReceivable: (itemOffered.typeOf === chevre.factory.product.ProductType.EventService)
            ? Number(req.body.accountsReceivable) * Number(referenceQuantityValue)
            : Number(req.body.accountsReceivable) * 1
    };
    if (typeof req.body.accounting === 'string' && req.body.accounting.length > 0) {
        const selectedAccountTitle = JSON.parse(req.body.accounting);
        accounting.operatingRevenue = {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: 'AccountTitle',
            codeValue: selectedAccountTitle.codeValue
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
    if (typeof req.body.eligibleMonetaryAmount === 'string' && req.body.eligibleMonetaryAmount.length > 0
        && typeof req.body.eligibleMonetaryAmountValue === 'string' && req.body.eligibleMonetaryAmountValue.length > 0) {
        const selectedCurrencyType = JSON.parse(req.body.eligibleMonetaryAmount);

        eligibleMonetaryAmount = [{
            typeOf: 'MonetaryAmount',
            currency: selectedCurrencyType.codeValue,
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
    }

    let validThrough: Date | undefined;
    if (typeof req.body.validThrough === 'string' && req.body.validThrough.length > 0) {
        validThrough = moment(`${req.body.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .toDate();
    }

    let pointAward: {
        /**
         * 付与金額
         */
        amount?: chevre.factory.monetaryAmount.IMonetaryAmount;
        /**
         * 特典説明
         */
        description?: string;
        typeOf: chevre.factory.actionType.MoneyTransfer;
    } | undefined;

    // ポイント特典通貨と金額の指定があれば適用する
    const pointAwardAmountValueByBody = req.body.itemOffered?.pointAward?.amount?.value;
    const pointAwardDescriptionByBody = req.body.itemOffered?.pointAward?.description;
    if (typeof req.body.pointAwardCurrecy === 'string' && req.body.pointAwardCurrecy.length > 0
        && typeof pointAwardAmountValueByBody === 'string' && pointAwardAmountValueByBody.length > 0) {
        const selectedCurrencyType = JSON.parse(req.body.pointAwardCurrecy);

        pointAward = {
            amount: {
                typeOf: 'MonetaryAmount',
                currency: selectedCurrencyType.codeValue,
                value: Number(pointAwardAmountValueByBody)
            },
            typeOf: chevre.factory.actionType.MoneyTransfer,
            ...(typeof pointAwardDescriptionByBody === 'string' && pointAwardDescriptionByBody.length > 0)
                ? { description: pointAwardDescriptionByBody }
                : undefined
        };
    }
    if (pointAward !== undefined) {
        itemOffered.pointAward = pointAward;
    }

    let color: string = 'rgb(51, 51, 51)';
    if (typeof req.body.color === 'string' && req.body.color.length > 0) {
        color = req.body.color;
    }

    let hasMerchantReturnPolicy: factory.unitPriceOffer.IHasMerchantReturnPolicy | undefined;
    if (Array.isArray(req.body.hasMerchantReturnPolicy) && req.body.hasMerchantReturnPolicy.length > 1) {
        throw new Error('選択可能な返品ポリシーは1つまでです');
    }
    if (Array.isArray(req.body.hasMerchantReturnPolicy)) {
        await Promise.all(req.body.hasMerchantReturnPolicy.map(async (a: any) => {
            const selectedReturnPolicy = JSON.parse(String(a));
            const searchReturnPoliciesResult = await merchantReturnPolicyService.search({
                limit: 1,
                id: { $eq: String(selectedReturnPolicy.id) }
            });
            const existingReturnPolicy = searchReturnPoliciesResult.data.shift();
            if (existingReturnPolicy === undefined) {
                throw new Error('返品ポリシーが見つかりません');
            }

            hasMerchantReturnPolicy = [{
                typeOf: 'MerchantReturnPolicy',
                id: String(existingReturnPolicy.id),
                identifier: String(existingReturnPolicy.identifier),
                name: existingReturnPolicy.name
            }];
        }));
    }

    let validRateLimit: factory.offer.IValidRateLimit | undefined;
    const validRateLimitScopeByBody = req.body.validRateLimit?.scope;
    const validRateLimitUnitInSecondsByBody = req.body.validRateLimit?.unitInSeconds;
    if (typeof validRateLimitScopeByBody === 'string' && validRateLimitScopeByBody.length > 0
        && typeof validRateLimitUnitInSecondsByBody === 'string' && validRateLimitUnitInSecondsByBody.length > 0) {
        validRateLimit = {
            scope: validRateLimitScopeByBody,
            unitInSeconds: Number(validRateLimitUnitInSecondsByBody)
        };
    }

    let priceSpec: chevre.factory.unitPriceOffer.IUnitPriceOfferPriceSpecification;
    if (itemOffered.typeOf === chevre.factory.product.ProductType.EventService) {
        priceSpec = {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: chevre.factory.priceSpecificationType.UnitPriceSpecification,
            name: req.body.name,
            price: Number(req.body.price) * Number(referenceQuantityValue),
            priceCurrency: chevre.factory.priceCurrency.JPY,
            valueAddedTaxIncluded: true,
            eligibleQuantity: eligibleQuantity,
            eligibleTransactionVolume: eligibleTransactionVolume,
            referenceQuantity: referenceQuantity,
            accounting: accounting,
            ...(Array.isArray(appliesToMovieTicket) && appliesToMovieTicket.length > 0)
                ? {
                    // sortを保証
                    appliesToMovieTicket: appliesToMovieTicket
                        .sort((a, b) => {
                            const serviceOutputTypeA = a.serviceOutputType.toUpperCase(); // 大文字と小文字を無視する
                            const serviceOutputTypeB = b.serviceOutputType.toUpperCase(); // 大文字と小文字を無視する
                            if (serviceOutputTypeA < serviceOutputTypeB) {
                                return -1;
                            }
                            if (serviceOutputTypeA > serviceOutputTypeB) {
                                return 1;
                            }

                            return 0;
                        })
                        .map((a) => {
                            return {
                                typeOf: chevre.factory.service.paymentService.PaymentServiceType.MovieTicket,
                                serviceType: a.codeValue,
                                serviceOutput: { typeOf: a.serviceOutputType }
                            };
                        })
                }
                : undefined
        };
    } else {
        priceSpec = {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: chevre.factory.priceSpecificationType.UnitPriceSpecification,
            name: req.body.name,
            price: Number(req.body.priceSpecification.price),
            priceCurrency: chevre.factory.priceCurrency.JPY,
            valueAddedTaxIncluded: true,
            referenceQuantity: referenceQuantity,
            accounting: accounting,
            eligibleQuantity: eligibleQuantity,
            eligibleTransactionVolume: eligibleTransactionVolume
        };
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.offerType.Offer,
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
        availability: availability,
        availableAtOrFrom: availableAtOrFrom,
        itemOffered: itemOffered,
        // eligibleCustomerType: eligibleCustomerType,
        priceSpecification: priceSpec,
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
        ...(Array.isArray(hasMerchantReturnPolicy)) ? { hasMerchantReturnPolicy } : undefined,
        ...(validRateLimit !== undefined) ? { validRateLimit } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(typeof color !== 'string') ? { color: 1 } : undefined,
                    ...(offerCategory === undefined) ? { category: 1 } : undefined,
                    ...(eligibleSeatingTypes === undefined) ? { eligibleSeatingType: 1 } : undefined,
                    ...(eligibleMembershipTypes === undefined) ? { eligibleMembershipType: 1 } : undefined,
                    ...(eligibleMonetaryAmount === undefined) ? { eligibleMonetaryAmount: 1 } : undefined,
                    ...(eligibleSubReservation === undefined) ? { eligibleSubReservation: 1 } : undefined,
                    ...(validFrom === undefined) ? { validFrom: 1 } : undefined,
                    ...(validThrough === undefined) ? { validThrough: 1 } : undefined,
                    ...(!Array.isArray(hasMerchantReturnPolicy)) ? { hasMerchantReturnPolicy: 1 } : undefined,
                    ...(validRateLimit === undefined) ? { validRateLimit: 1 } : undefined
                }
            }
            : undefined
    };
}

function validateFormAdd() {
    return [
        body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            // .isAlphanumeric()
            .matches(/^[0-9a-zA-Z\-_]+$/)
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 30)),

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
            .withMessage(() => Message.Common.getMaxLength('発生金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('accountsReceivable')
            .notEmpty()
            .withMessage(() => Message.Common.required.replace('$fieldName$', '売上金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(() => Message.Common.getMaxLength('売上金額', CHAGE_MAX_LENGTH))
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
            .withMessage(() => '0もしくは正の値を入力してください'),

        body('itemOffered.pointAward.amount.value')
            .optional()
            .if((value: any) => typeof value === 'string' && value.length > 0)
            .isNumeric()
            .withMessage('数値を入力してください')
            .isLength({ max: 10 })
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')

    ];
}

export { ticketTypeMasterRouter };
