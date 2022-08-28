"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryCodeSets = void 0;
const sdk_1 = require("@cinerino/sdk");
const AVAILABLE_PRODUCT_TYPES = (typeof process.env.AVAILABLE_PRODUCT_TYPES === 'string')
    ? process.env.AVAILABLE_PRODUCT_TYPES.split(',')
    : [];
const sets = [
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType,
        name: 'レイティング区分',
        description: 'コンテンツのレイティングの種類を管理します。'
    },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.DistributorType,
        name: '配給区分',
        description: 'コンテンツの配給の種類を管理します。'
    },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType,
        name: '決済カード区分',
        description: 'ムビチケ系決済カードの券種区分を管理します。使用されるムビチケの券種区分は全て管理する必要があります。'
    },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType,
        name: 'オファーカテゴリー区分',
        description: 'オファーのカテゴリーの種類を管理します。'
    },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType,
        name: '決済方法区分',
        description: '決済方法の種類を管理します。'
    },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.SeatingType,
        name: '座席区分',
        description: '座席(施設)の種類を管理します。'
    },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.ServiceType,
        name: '興行区分',
        description: '興行の種類を管理します。'
    },
    // いったん不使用なので保留
    // {
    //     identifier: chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType,
    //     name: '音響方式',
    //     description: ''
    // },
    {
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType,
        name: '上映方式区分',
        description: '施設コンテンツの上映方式を管理します。'
    }
];
if (AVAILABLE_PRODUCT_TYPES.includes(sdk_1.chevre.factory.product.ProductType.MembershipService)) {
    sets.push({
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.MembershipType,
        name: 'メンバーシップ区分',
        description: ''
    });
}
if (AVAILABLE_PRODUCT_TYPES.includes(sdk_1.chevre.factory.product.ProductType.PaymentCard)) {
    sets.push({
        identifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType,
        name: '通貨区分',
        description: ''
    });
}
exports.categoryCodeSets = sets;
