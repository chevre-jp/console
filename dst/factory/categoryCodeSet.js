"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryCodeSets = void 0;
const sdk_1 = require("@cinerino/sdk");
const sets = [
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType, name: 'レイティング' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.DistributorType, name: '配給' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType, name: '決済カード区分' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType, name: 'オファーカテゴリー' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType, name: '決済方法' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType, name: '座席区分' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType, name: 'サービス区分' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType, name: '音響方式' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType, name: '上映方式' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MembershipType, name: 'メンバーシップ区分' },
    { identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType, name: '通貨' }
];
exports.categoryCodeSets = sets;
