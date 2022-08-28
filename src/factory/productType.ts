import { factory } from '@cinerino/sdk';

export import ProductType = factory.product.ProductType;

export interface IProductType {
    codeValue: string;
    name: string;
}

const types: IProductType[] = [
    { codeValue: ProductType.EventService, name: '興行' },
    { codeValue: ProductType.Product, name: 'アドオン' }
];

const AVAILABLE_PRODUCT_TYPES = (typeof process.env.AVAILABLE_PRODUCT_TYPES === 'string')
    ? process.env.AVAILABLE_PRODUCT_TYPES.split(',')
    : [];

if (AVAILABLE_PRODUCT_TYPES.includes(ProductType.MembershipService)) {
    types.push(
        { codeValue: ProductType.MembershipService, name: 'メンバーシップ' }
    );
}
if (AVAILABLE_PRODUCT_TYPES.includes(ProductType.PaymentCard)) {
    types.push(
        { codeValue: ProductType.PaymentCard, name: 'ペイメントカード' }
    );
}

export const productTypes = types;
