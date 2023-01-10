"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMaximumAttendeeCapacity = exports.createOffers4event = exports.createOffers = exports.createEmails = exports.OnlineDisplayType = exports.DateTimeSettingType = exports.DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = void 0;
/**
 * イベントファクトリー
 */
const sdk_1 = require("@cinerino/sdk");
const moment = require("moment");
const pug = require("pug");
const movieTheater_1 = require("../places/movieTheater");
const POS_CLIENT_ID = process.env.POS_CLIENT_ID;
exports.DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;
var DateTimeSettingType;
(function (DateTimeSettingType) {
    DateTimeSettingType["Default"] = "default";
    DateTimeSettingType["Absolute"] = "absolute";
    DateTimeSettingType["Relative"] = "relative";
})(DateTimeSettingType = exports.DateTimeSettingType || (exports.DateTimeSettingType = {}));
var OnlineDisplayType;
(function (OnlineDisplayType) {
    OnlineDisplayType["Absolute"] = "absolute";
    OnlineDisplayType["Relative"] = "relative";
})(OnlineDisplayType = exports.OnlineDisplayType || (exports.OnlineDisplayType = {}));
/**
 * イベントステータス変更時送信Eメールを作成する
 */
function createEmails(orders, notice, emailMessageOnCanceled) {
    return __awaiter(this, void 0, void 0, function* () {
        if (orders.length === 0) {
            return [];
        }
        return Promise.all(orders.map((order) => __awaiter(this, void 0, void 0, function* () {
            return createEmail(order, notice, emailMessageOnCanceled);
        })));
    });
}
exports.createEmails = createEmails;
function createEmail(order, notice, emailMessageOnCanceled) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield new Promise((resolve, reject) => {
            pug.render(emailMessageOnCanceled.text, {
                moment,
                order,
                notice
            }, (err, message) => {
                if (err instanceof Error) {
                    reject(new sdk_1.chevre.factory.errors.Argument('emailTemplate', err.message));
                    return;
                }
                resolve(message);
            });
        });
        // メール作成
        const emailMessage = {
            typeOf: sdk_1.chevre.factory.creativeWorkType.EmailMessage,
            identifier: `updateOnlineStatus-${order.orderNumber}`,
            name: `updateOnlineStatus-${order.orderNumber}`,
            sender: {
                typeOf: order.seller.typeOf,
                name: emailMessageOnCanceled.sender.name,
                email: emailMessageOnCanceled.sender.email
            },
            toRecipient: {
                typeOf: order.customer.typeOf,
                name: order.customer.name,
                email: order.customer.email
            },
            about: {
                typeOf: 'Thing',
                identifier: emailMessageOnCanceled.about.identifier,
                name: emailMessageOnCanceled.about.name
            },
            text: content
        };
        const purpose = {
            typeOf: order.typeOf,
            seller: order.seller,
            customer: order.customer,
            orderNumber: order.orderNumber,
            price: order.price,
            priceCurrency: order.priceCurrency,
            orderDate: moment(order.orderDate)
                .toDate()
        };
        const recipient = {
            id: order.customer.id,
            name: emailMessage.toRecipient.name,
            typeOf: order.customer.typeOf
        };
        return {
            typeOf: sdk_1.chevre.factory.actionType.SendAction,
            agent: order.project,
            object: emailMessage,
            project: { typeOf: order.project.typeOf, id: order.project.id },
            purpose: purpose,
            recipient
        };
    });
}
// tslint:disable-next-line:max-func-body-length
function createOffers(params) {
    const serviceOutput = (params.reservedSeatsAvailable)
        ? {
            typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
            reservedTicket: {
                typeOf: 'Ticket',
                ticketedSeat: {
                    typeOf: sdk_1.chevre.factory.placeType.Seat
                }
            }
        }
        : {
            typeOf: sdk_1.chevre.factory.reservationType.EventReservation,
            reservedTicket: {
                typeOf: 'Ticket'
            }
        };
    // makesOfferを自動設定(2022-11-19~)
    let makesOffer;
    if (params.isNew) {
        // 新規作成時は、自動的に全販売アプリケーションを設定
        makesOffer = params.customerMembers.map((member) => {
            // POS_CLIENT_IDのみデフォルト設定を調整
            if (typeof POS_CLIENT_ID === 'string' && POS_CLIENT_ID === member.member.id) {
                if (!(params.availabilityEndsOnPOS instanceof Date)
                    || !(params.availabilityStartsOnPOS instanceof Date)
                    || !(params.validFromOnPOS instanceof Date)
                    || !(params.validThroughOnPOS instanceof Date)) {
                    throw new Error('施設のPOS興行初期設定が見つかりません');
                }
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEndsOnPOS,
                    availabilityStarts: params.availabilityStartsOnPOS,
                    validFrom: params.validFromOnPOS,
                    validThrough: params.validThroughOnPOS // 1 month later from startDate
                };
            }
            else {
                // POS_CLIENT_ID以外は共通設定
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEnds,
                    availabilityStarts: params.availabilityStarts,
                    validFrom: params.validFrom,
                    validThrough: params.validThrough
                };
            }
        });
    }
    else {
        makesOffer = [];
        params.makesOffers4update.forEach((makesOffer4update) => {
            var _a;
            const applicationId = String((_a = makesOffer4update.availableAtOrFrom) === null || _a === void 0 ? void 0 : _a.id);
            // アプリケーションメンバーの存在検証(バックエンドで検証しているため不要か)
            // const applicationExists = params.customerMembers.some((customerMember) => customerMember.member.id === applicationId);
            // if (!applicationExists) {
            //     throw new Error(`アプリケーション: ${applicationId} が見つかりません`);
            // }
            // アプリケーションの重複を排除
            const alreadyExistsInMakesOffer = makesOffer.some((offer) => {
                var _a;
                return Array.isArray(offer.availableAtOrFrom) && ((_a = offer.availableAtOrFrom[0]) === null || _a === void 0 ? void 0 : _a.id) === applicationId;
            });
            if (!alreadyExistsInMakesOffer) {
                const validFromMoment = moment(`${makesOffer4update.validFromDate}T${makesOffer4update.validFromTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const validThroughMoment = moment(`${makesOffer4update.validThroughDate}T${makesOffer4update.validThroughTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const availabilityStartsMoment = moment(`${makesOffer4update.availabilityStartsDate}T${makesOffer4update.availabilityStartsTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                if (!validFromMoment.isValid() || !validThroughMoment.isValid() || !availabilityStartsMoment.isValid()) {
                    throw new Error('販売アプリ設定の日時を正しく入力してください');
                }
                makesOffer.push({
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: applicationId }],
                    availabilityEnds: validThroughMoment.toDate(),
                    availabilityStarts: availabilityStartsMoment.toDate(),
                    validFrom: validFromMoment.toDate(),
                    validThrough: validThroughMoment.toDate()
                });
            }
        });
    }
    const seller = { makesOffer };
    const makesOfferValidFromMin = moment(params.startDate)
        .add(-movieTheater_1.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
    const makesOfferValidFromMax = moment(params.startDate)
        .add(movieTheater_1.ONE_MONTH_IN_DAYS, 'days');
    // 販売期間と表示期間の最小、最大検証(2022-11-25~)
    const isEveryMakesOfferValid = seller.makesOffer.every((offer) => {
        return moment(offer.availabilityEnds)
            .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.availabilityStarts)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.validFrom)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.validThrough)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]');
    });
    if (!isEveryMakesOfferValid) {
        throw new Error(`販売期間と表示期間は${movieTheater_1.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS}日前~${movieTheater_1.ONE_MONTH_IN_DAYS}日後の間で入力してください`);
    }
    return Object.assign({ 
        // availabilityEnds,
        // availabilityStarts,
        eligibleQuantity: { maxValue: Number(params.eligibleQuantity.maxValue) }, itemOffered: {
            id: params.itemOffered.id,
            serviceOutput
        }, 
        // validFrom,
        // validThrough,
        seller }, (Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined);
}
exports.createOffers = createOffers;
// tslint:disable-next-line:max-func-body-length
function createOffers4event(params) {
    const reservationFor = {
        typeOf: sdk_1.chevre.factory.tripType.BusTrip,
        identifier: params.itemOffered.serviceOutput.reservationFor.identifier,
        arrivalBusStop: {
            typeOf: sdk_1.chevre.factory.placeType.BusStop,
            name: { ja: 'xxx' },
            branchCode: 'xxx'
        },
        departureBusStop: {
            typeOf: sdk_1.chevre.factory.placeType.BusStop,
            name: { ja: 'xxx' },
            branchCode: 'xxx'
        },
        arrivalTime: new Date(),
        departureTime: new Date(),
        busName: { ja: 'xxx' },
        busNumber: 'xxx'
    };
    const serviceOutput = (params.reservedSeatsAvailable)
        ? {
            typeOf: sdk_1.chevre.factory.reservationType.BusReservation,
            reservationFor,
            reservedTicket: {
                typeOf: 'Ticket',
                ticketedSeat: {
                    typeOf: sdk_1.chevre.factory.placeType.Seat
                }
            }
        }
        : {
            typeOf: sdk_1.chevre.factory.reservationType.BusReservation,
            reservationFor,
            reservedTicket: {
                typeOf: 'Ticket'
            }
        };
    // makesOfferを自動設定(2022-11-19~)
    let makesOffer;
    if (params.isNew) {
        // 新規作成時は、自動的に全販売アプリケーションを設定
        makesOffer = params.customerMembers.map((member) => {
            // POS_CLIENT_IDのみデフォルト設定を調整
            if (typeof POS_CLIENT_ID === 'string' && POS_CLIENT_ID === member.member.id) {
                if (!(params.availabilityEndsOnPOS instanceof Date)
                    || !(params.availabilityStartsOnPOS instanceof Date)
                    || !(params.validFromOnPOS instanceof Date)
                    || !(params.validThroughOnPOS instanceof Date)) {
                    throw new Error('施設のPOS興行初期設定が見つかりません');
                }
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEndsOnPOS,
                    availabilityStarts: params.availabilityStartsOnPOS,
                    validFrom: params.validFromOnPOS,
                    validThrough: params.validThroughOnPOS // 1 month later from startDate
                };
            }
            else {
                // POS_CLIENT_ID以外は共通設定
                return {
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEnds,
                    availabilityStarts: params.availabilityStarts,
                    validFrom: params.validFrom,
                    validThrough: params.validThrough
                };
            }
        });
    }
    else {
        makesOffer = [];
        params.makesOffers4update.forEach((makesOffer4update) => {
            var _a;
            const applicationId = String((_a = makesOffer4update.availableAtOrFrom) === null || _a === void 0 ? void 0 : _a.id);
            // アプリケーションメンバーの存在検証(バックエンドで検証しているため不要か)
            // const applicationExists = params.customerMembers.some((customerMember) => customerMember.member.id === applicationId);
            // if (!applicationExists) {
            //     throw new Error(`アプリケーション: ${applicationId} が見つかりません`);
            // }
            // アプリケーションの重複を排除
            const alreadyExistsInMakesOffer = makesOffer.some((offer) => {
                var _a;
                return Array.isArray(offer.availableAtOrFrom) && ((_a = offer.availableAtOrFrom[0]) === null || _a === void 0 ? void 0 : _a.id) === applicationId;
            });
            if (!alreadyExistsInMakesOffer) {
                const validFromMoment = moment(`${makesOffer4update.validFromDate}T${makesOffer4update.validFromTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const validThroughMoment = moment(`${makesOffer4update.validThroughDate}T${makesOffer4update.validThroughTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const availabilityStartsMoment = moment(`${makesOffer4update.availabilityStartsDate}T${makesOffer4update.availabilityStartsTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                if (!validFromMoment.isValid() || !validThroughMoment.isValid() || !availabilityStartsMoment.isValid()) {
                    throw new Error('販売アプリ設定の日時を正しく入力してください');
                }
                makesOffer.push({
                    typeOf: sdk_1.chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: applicationId }],
                    availabilityEnds: validThroughMoment.toDate(),
                    availabilityStarts: availabilityStartsMoment.toDate(),
                    validFrom: validFromMoment.toDate(),
                    validThrough: validThroughMoment.toDate()
                });
            }
        });
    }
    const seller = { makesOffer };
    const makesOfferValidFromMin = moment(params.startDate)
        .add(-movieTheater_1.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
    const makesOfferValidFromMax = moment(params.startDate)
        .add(movieTheater_1.ONE_MONTH_IN_DAYS, 'days');
    // 販売期間と表示期間の最小、最大検証(2022-11-25~)
    const isEveryMakesOfferValid = seller.makesOffer.every((offer) => {
        return moment(offer.availabilityEnds)
            .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.availabilityStarts)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.validFrom)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]')
            && moment(offer.validThrough)
                .isBetween(makesOfferValidFromMin, makesOfferValidFromMax, 'second', '[]');
    });
    if (!isEveryMakesOfferValid) {
        throw new Error(`販売期間と表示期間は${movieTheater_1.MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS}日前~${movieTheater_1.ONE_MONTH_IN_DAYS}日後の間で入力してください`);
    }
    return Object.assign({ 
        // availabilityEnds,
        // availabilityStarts,
        eligibleQuantity: { maxValue: Number(params.eligibleQuantity.maxValue) }, itemOffered: {
            id: params.itemOffered.id,
            serviceOutput,
            availableChannel: params.availableChannel
        }, 
        // validFrom,
        // validThrough,
        seller }, (Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined);
}
exports.createOffers4event = createOffers4event;
function validateMaximumAttendeeCapacity(subscription, maximumAttendeeCapacity) {
    if ((subscription === null || subscription === void 0 ? void 0 : subscription.settings.allowNoCapacity) !== true) {
        if (typeof maximumAttendeeCapacity !== 'number') {
            throw new Error('キャパシティを入力してください');
        }
    }
    if (typeof maximumAttendeeCapacity === 'number') {
        if (maximumAttendeeCapacity < 0) {
            throw new Error('キャパシティには正の値を入力してください');
        }
        const maximumAttendeeCapacitySetting = subscription === null || subscription === void 0 ? void 0 : subscription.settings.maximumAttendeeCapacity;
        if (typeof maximumAttendeeCapacitySetting === 'number') {
            if (maximumAttendeeCapacity > maximumAttendeeCapacitySetting) {
                throw new Error(`キャパシティの最大値は${maximumAttendeeCapacitySetting}です`);
            }
        }
    }
}
exports.validateMaximumAttendeeCapacity = validateMaximumAttendeeCapacity;
