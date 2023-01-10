/**
 * イベントファクトリー
 */
import { chevre } from '@cinerino/sdk';
import * as moment from 'moment';
import * as pug from 'pug';

import { IEmailMessageInDB } from '../emailMessages';
import { MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, ONE_MONTH_IN_DAYS } from '../places/movieTheater';

const POS_CLIENT_ID = process.env.POS_CLIENT_ID;

export const DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;

import { ISubscription } from '../../factory/subscription';

export enum DateTimeSettingType {
    Default = 'default',
    Absolute = 'absolute',
    Relative = 'relative'
}

export enum OnlineDisplayType {
    Absolute = 'absolute',
    Relative = 'relative'
}

/**
 * イベントステータス変更時送信Eメールを作成する
 */
export async function createEmails(
    orders: chevre.factory.order.IOrder[],
    notice: string,
    emailMessageOnCanceled: IEmailMessageInDB
): Promise<chevre.factory.action.transfer.send.message.email.IAttributes[]> {
    if (orders.length === 0) {
        return [];
    }

    return Promise.all(orders.map(async (order) => {
        return createEmail(order, notice, emailMessageOnCanceled);
    }));
}

async function createEmail(
    order: chevre.factory.order.IOrder,
    notice: string,
    emailMessageOnCanceled: IEmailMessageInDB
): Promise<chevre.factory.action.transfer.send.message.email.IAttributes> {
    const content = await new Promise<string>((resolve, reject) => {
        pug.render(
            emailMessageOnCanceled.text,
            {
                moment,
                order,
                notice
            },
            (err, message) => {
                if (err instanceof Error) {
                    reject(new chevre.factory.errors.Argument('emailTemplate', err.message));

                    return;
                }

                resolve(message);
            }
        );
    });

    // メール作成
    const emailMessage: chevre.factory.creativeWork.message.email.ICreativeWork = {
        typeOf: chevre.factory.creativeWorkType.EmailMessage,
        identifier: `updateOnlineStatus-${order.orderNumber}`,
        name: `updateOnlineStatus-${order.orderNumber}`,
        sender: {
            typeOf: order.seller.typeOf,
            name: emailMessageOnCanceled.sender.name,
            email: emailMessageOnCanceled.sender.email
        },
        toRecipient: {
            typeOf: order.customer.typeOf,
            name: <string>order.customer.name,
            email: <string>order.customer.email
        },
        about: {
            typeOf: 'Thing',
            identifier: emailMessageOnCanceled.about.identifier,
            name: emailMessageOnCanceled.about.name
        },
        text: content
    };

    const purpose: chevre.factory.order.ISimpleOrder = {
        typeOf: order.typeOf,
        seller: order.seller,
        customer: order.customer,
        orderNumber: order.orderNumber,
        price: order.price,
        priceCurrency: order.priceCurrency,
        orderDate: moment(order.orderDate)
            .toDate()
    };

    const recipient: chevre.factory.action.IParticipantAsPerson | chevre.factory.action.IParticipantAsWebApplication = {
        id: order.customer.id,
        name: emailMessage.toRecipient.name,
        typeOf: <chevre.factory.personType.Person | chevre.factory.creativeWorkType.WebApplication>order.customer.typeOf
    };

    return {
        typeOf: chevre.factory.actionType.SendAction,
        agent: order.project,
        object: emailMessage,
        project: { typeOf: order.project.typeOf, id: order.project.id },
        purpose: purpose,
        recipient
    };
}

/**
 * イベント更新時のmakesOfferパラメータ(req.body)
 */
interface IMakesOffer4update {
    availableAtOrFrom: { id: string };
    validFromDate: string; //'2022/08/16',
    validFromTime: string; //'09:00',
    validThroughDate: string; //'2022/12/17',
    validThroughTime: string; // '10:00',
    availabilityStartsDate: string; // '2022/08/16',
    availabilityStartsTime: string; //'09:00'
}

// tslint:disable-next-line:max-func-body-length
export function createOffers(params: {
    availabilityEnds: Date;
    availabilityStarts: Date;
    eligibleQuantity: { maxValue: number };
    itemOffered: { id: string };
    validFrom: Date;
    validThrough: Date;
    availabilityEndsOnPOS?: Date;
    availabilityStartsOnPOS?: Date;
    validFromOnPOS?: Date;
    validThroughOnPOS?: Date;
    // seller: { id: string };
    unacceptedPaymentMethod?: string[];
    reservedSeatsAvailable: boolean;
    // 販売アプリケーションメンバーリスト
    customerMembers: chevre.factory.iam.IMember[];
    endDate: Date;
    startDate: Date;
    isNew: boolean;
    makesOffers4update: IMakesOffer4update[];
}): chevre.factory.event.screeningEvent.IOffers4create {
    const serviceOutput: chevre.factory.event.screeningEvent.IServiceOutput
        = (params.reservedSeatsAvailable)
            ? {
                typeOf: chevre.factory.reservationType.EventReservation,
                reservedTicket: {
                    typeOf: 'Ticket',
                    ticketedSeat: {
                        typeOf: chevre.factory.placeType.Seat
                    }
                }
            }
            : {
                typeOf: chevre.factory.reservationType.EventReservation,
                reservedTicket: {
                    typeOf: 'Ticket'
                }
            };

    // makesOfferを自動設定(2022-11-19~)
    let makesOffer: chevre.factory.event.screeningEvent.ISellerMakesOffer[];

    if (params.isNew) {
        // 新規作成時は、自動的に全販売アプリケーションを設定
        makesOffer = params.customerMembers.map((member) => {
            // POS_CLIENT_IDのみデフォルト設定を調整
            if (typeof POS_CLIENT_ID === 'string' && POS_CLIENT_ID === member.member.id) {
                if (!(params.availabilityEndsOnPOS instanceof Date)
                    || !(params.availabilityStartsOnPOS instanceof Date)
                    || !(params.validFromOnPOS instanceof Date)
                    || !(params.validThroughOnPOS instanceof Date)
                ) {
                    throw new Error('施設のPOS興行初期設定が見つかりません');
                }

                return {
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEndsOnPOS, // 1 month later from startDate
                    availabilityStarts: params.availabilityStartsOnPOS, // startのMAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前
                    validFrom: params.validFromOnPOS, // startのMAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前
                    validThrough: params.validThroughOnPOS // 1 month later from startDate
                };
            } else {
                // POS_CLIENT_ID以外は共通設定
                return {
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEnds,
                    availabilityStarts: params.availabilityStarts,
                    validFrom: params.validFrom,
                    validThrough: params.validThrough
                };
            }
        });
    } else {
        makesOffer = [];
        params.makesOffers4update.forEach((makesOffer4update) => {
            const applicationId = String(makesOffer4update.availableAtOrFrom?.id);
            // アプリケーションメンバーの存在検証(バックエンドで検証しているため不要か)
            // const applicationExists = params.customerMembers.some((customerMember) => customerMember.member.id === applicationId);
            // if (!applicationExists) {
            //     throw new Error(`アプリケーション: ${applicationId} が見つかりません`);
            // }

            // アプリケーションの重複を排除
            const alreadyExistsInMakesOffer = makesOffer.some((offer) => {
                return Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom[0]?.id === applicationId;
            });
            if (!alreadyExistsInMakesOffer) {
                const validFromMoment = moment(`${makesOffer4update.validFromDate}T${makesOffer4update.validFromTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const validThroughMoment = moment(`${makesOffer4update.validThroughDate}T${makesOffer4update.validThroughTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const availabilityStartsMoment = moment(`${makesOffer4update.availabilityStartsDate}T${makesOffer4update.availabilityStartsTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                if (!validFromMoment.isValid() || !validThroughMoment.isValid() || !availabilityStartsMoment.isValid()) {
                    throw new Error('販売アプリ設定の日時を正しく入力してください');
                }
                makesOffer.push({
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: applicationId }],
                    availabilityEnds: validThroughMoment.toDate(),
                    availabilityStarts: availabilityStartsMoment.toDate(),
                    validFrom: validFromMoment.toDate(),
                    validThrough: validThroughMoment.toDate()
                });
            }
        });
    }

    const seller: chevre.factory.event.screeningEvent.ISeller4create = { makesOffer };

    const makesOfferValidFromMin = moment(params.startDate)
        .add(-MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
    const makesOfferValidFromMax = moment(params.startDate)
        .add(ONE_MONTH_IN_DAYS, 'days');

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
        throw new Error(`販売期間と表示期間は${MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS}日前~${ONE_MONTH_IN_DAYS}日後の間で入力してください`);
    }

    return {
        // availabilityEnds,
        // availabilityStarts,
        eligibleQuantity: { maxValue: Number(params.eligibleQuantity.maxValue) },
        itemOffered: {
            id: params.itemOffered.id,
            serviceOutput
        },
        // validFrom,
        // validThrough,
        seller,
        ...(Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined
    };
}

// tslint:disable-next-line:max-func-body-length
export function createOffers4event(params: {
    availabilityEnds: Date;
    availabilityStarts: Date;
    eligibleQuantity: { maxValue: number };
    itemOffered: {
        id: string;
        serviceOutput: {
            reservationFor: { identifier: string };
        };
    };
    validFrom: Date;
    validThrough: Date;
    availabilityEndsOnPOS?: Date;
    availabilityStartsOnPOS?: Date;
    validFromOnPOS?: Date;
    validThroughOnPOS?: Date;
    // seller: { id: string };
    unacceptedPaymentMethod?: string[];
    reservedSeatsAvailable: boolean;
    // 販売アプリケーションメンバーリスト
    customerMembers: chevre.factory.iam.IMember[];
    endDate: Date;
    startDate: Date;
    isNew: boolean;
    makesOffers4update: IMakesOffer4update[];
    availableChannel: {
        serviceLocation: {
            /**
             * ルームコード
             */
            branchCode: string;
            containedInPlace: {
                /**
                 * 施設ID
                 */
                id: string;
            };
        };
    };
}): chevre.factory.event.event.IOffers4create {
    const reservationFor: chevre.factory.event.event.IReservationFor = {
        typeOf: chevre.factory.tripType.BusTrip,
        identifier: params.itemOffered.serviceOutput.reservationFor.identifier,
        arrivalBusStop: {
            typeOf: chevre.factory.placeType.BusStop,
            name: { ja: 'xxx' },
            branchCode: 'xxx'
        },
        departureBusStop: {
            typeOf: chevre.factory.placeType.BusStop,
            name: { ja: 'xxx' },
            branchCode: 'xxx'
        },
        arrivalTime: new Date(),
        departureTime: new Date(),
        busName: { ja: 'xxx' },
        busNumber: 'xxx'
    };
    const serviceOutput: chevre.factory.event.event.IServiceOutput
        = (params.reservedSeatsAvailable)
            ? {
                typeOf: chevre.factory.reservationType.BusReservation,
                reservationFor,
                reservedTicket: {
                    typeOf: 'Ticket',
                    ticketedSeat: {
                        typeOf: chevre.factory.placeType.Seat
                    }
                }
            }
            : {
                typeOf: chevre.factory.reservationType.BusReservation,
                reservationFor,
                reservedTicket: {
                    typeOf: 'Ticket'
                }
            };

    // makesOfferを自動設定(2022-11-19~)
    let makesOffer: chevre.factory.event.event.ISellerMakesOffer[];

    if (params.isNew) {
        // 新規作成時は、自動的に全販売アプリケーションを設定
        makesOffer = params.customerMembers.map((member) => {
            // POS_CLIENT_IDのみデフォルト設定を調整
            if (typeof POS_CLIENT_ID === 'string' && POS_CLIENT_ID === member.member.id) {
                if (!(params.availabilityEndsOnPOS instanceof Date)
                    || !(params.availabilityStartsOnPOS instanceof Date)
                    || !(params.validFromOnPOS instanceof Date)
                    || !(params.validThroughOnPOS instanceof Date)
                ) {
                    throw new Error('施設のPOS興行初期設定が見つかりません');
                }

                return {
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEndsOnPOS, // 1 month later from startDate
                    availabilityStarts: params.availabilityStartsOnPOS, // startのMAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前
                    validFrom: params.validFromOnPOS, // startのMAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS前
                    validThrough: params.validThroughOnPOS // 1 month later from startDate
                };
            } else {
                // POS_CLIENT_ID以外は共通設定
                return {
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: member.member.id }],
                    availabilityEnds: params.availabilityEnds,
                    availabilityStarts: params.availabilityStarts,
                    validFrom: params.validFrom,
                    validThrough: params.validThrough
                };
            }
        });
    } else {
        makesOffer = [];
        params.makesOffers4update.forEach((makesOffer4update) => {
            const applicationId = String(makesOffer4update.availableAtOrFrom?.id);
            // アプリケーションメンバーの存在検証(バックエンドで検証しているため不要か)
            // const applicationExists = params.customerMembers.some((customerMember) => customerMember.member.id === applicationId);
            // if (!applicationExists) {
            //     throw new Error(`アプリケーション: ${applicationId} が見つかりません`);
            // }

            // アプリケーションの重複を排除
            const alreadyExistsInMakesOffer = makesOffer.some((offer) => {
                return Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom[0]?.id === applicationId;
            });
            if (!alreadyExistsInMakesOffer) {
                const validFromMoment = moment(`${makesOffer4update.validFromDate}T${makesOffer4update.validFromTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const validThroughMoment = moment(`${makesOffer4update.validThroughDate}T${makesOffer4update.validThroughTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                const availabilityStartsMoment = moment(`${makesOffer4update.availabilityStartsDate}T${makesOffer4update.availabilityStartsTime}+09:00`, 'YYYY/MM/DDTHH:mmZ');
                if (!validFromMoment.isValid() || !validThroughMoment.isValid() || !availabilityStartsMoment.isValid()) {
                    throw new Error('販売アプリ設定の日時を正しく入力してください');
                }
                makesOffer.push({
                    typeOf: chevre.factory.offerType.Offer,
                    availableAtOrFrom: [{ id: applicationId }],
                    availabilityEnds: validThroughMoment.toDate(),
                    availabilityStarts: availabilityStartsMoment.toDate(),
                    validFrom: validFromMoment.toDate(),
                    validThrough: validThroughMoment.toDate()
                });
            }
        });
    }

    const seller: chevre.factory.event.screeningEvent.ISeller4create = { makesOffer };

    const makesOfferValidFromMin = moment(params.startDate)
        .add(-MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS, 'days');
    const makesOfferValidFromMax = moment(params.startDate)
        .add(ONE_MONTH_IN_DAYS, 'days');

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
        throw new Error(`販売期間と表示期間は${MAXIMUM_RESERVATION_GRACE_PERIOD_IN_DAYS}日前~${ONE_MONTH_IN_DAYS}日後の間で入力してください`);
    }

    return {
        // availabilityEnds,
        // availabilityStarts,
        eligibleQuantity: { maxValue: Number(params.eligibleQuantity.maxValue) },
        itemOffered: {
            id: params.itemOffered.id,
            serviceOutput,
            availableChannel: params.availableChannel
        },
        // validFrom,
        // validThrough,
        seller,
        ...(Array.isArray(params.unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: params.unacceptedPaymentMethod } : undefined
    };
}

export function validateMaximumAttendeeCapacity(
    subscription?: ISubscription,
    maximumAttendeeCapacity?: number
) {
    if (subscription?.settings.allowNoCapacity !== true) {
        if (typeof maximumAttendeeCapacity !== 'number') {
            throw new Error('キャパシティを入力してください');
        }
    }

    if (typeof maximumAttendeeCapacity === 'number') {
        if (maximumAttendeeCapacity < 0) {
            throw new Error('キャパシティには正の値を入力してください');
        }

        const maximumAttendeeCapacitySetting = subscription?.settings.maximumAttendeeCapacity;
        if (typeof maximumAttendeeCapacitySetting === 'number') {
            if (maximumAttendeeCapacity > maximumAttendeeCapacitySetting) {
                throw new Error(`キャパシティの最大値は${maximumAttendeeCapacitySetting}です`);
            }
        }
    }
}
