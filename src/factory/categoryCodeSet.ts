import { chevre } from '@cinerino/sdk';

export interface ICategoryCodeSet {
    identifier: chevre.factory.categoryCode.CategorySetIdentifier;
    name: string;
}

const AVAILABLE_PRODUCT_TYPES = (typeof process.env.AVAILABLE_PRODUCT_TYPES === 'string')
    ? process.env.AVAILABLE_PRODUCT_TYPES.split(',')
    : [];

const sets: ICategoryCodeSet[] = [
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType, name: 'レイティング' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.DistributorType, name: '配給' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.MovieTicketType, name: '決済カード区分' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType, name: 'オファーカテゴリー' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.PaymentMethodType, name: '決済方法' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType, name: '座席区分' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType, name: 'サービス区分' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.SoundFormatType, name: '音響方式' },
    { identifier: chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType, name: '上映方式' }
];

if (AVAILABLE_PRODUCT_TYPES.includes(chevre.factory.product.ProductType.MembershipService)) {
    sets.push(
        { identifier: chevre.factory.categoryCode.CategorySetIdentifier.MembershipType, name: 'メンバーシップ区分' }
    );
}
if (AVAILABLE_PRODUCT_TYPES.includes(chevre.factory.product.ProductType.PaymentCard)) {
    sets.push(
        { identifier: chevre.factory.categoryCode.CategorySetIdentifier.CurrencyType, name: '通貨' }
    );
}

export const categoryCodeSets = sets;
