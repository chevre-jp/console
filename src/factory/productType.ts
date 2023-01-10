import { factory } from '@cinerino/sdk';

export import ProductType = factory.product.ProductType;

const AVAILABLE_PRODUCT_TYPES = (typeof process.env.AVAILABLE_PRODUCT_TYPES === 'string')
    ? process.env.AVAILABLE_PRODUCT_TYPES.split(',')
    : [];

export interface IProductType {
    codeValue: string;
    name: string;
}

const types: IProductType[] = [{ codeValue: ProductType.EventService, name: '興行' }];

if (AVAILABLE_PRODUCT_TYPES.includes(ProductType.Transportation)) {
    types.push({ codeValue: ProductType.Transportation, name: '旅客' });
}
types.push({ codeValue: ProductType.Product, name: 'アドオン' });
if (AVAILABLE_PRODUCT_TYPES.includes(ProductType.MembershipService)) {
    types.push({ codeValue: ProductType.MembershipService, name: 'メンバーシップ' });
}
if (AVAILABLE_PRODUCT_TYPES.includes(ProductType.PaymentCard)) {
    types.push({ codeValue: ProductType.PaymentCard, name: 'ペイメントカード' });
}

export const productTypes = types;
