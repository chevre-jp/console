"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productTypes = exports.ProductType = void 0;
const sdk_1 = require("@cinerino/sdk");
exports.ProductType = sdk_1.factory.product.ProductType;
const AVAILABLE_PRODUCT_TYPES = (typeof process.env.AVAILABLE_PRODUCT_TYPES === 'string')
    ? process.env.AVAILABLE_PRODUCT_TYPES.split(',')
    : [];
const types = [{ codeValue: exports.ProductType.EventService, name: '興行' }];
if (AVAILABLE_PRODUCT_TYPES.includes(exports.ProductType.Transportation)) {
    types.push({ codeValue: exports.ProductType.Transportation, name: '旅客' });
}
types.push({ codeValue: exports.ProductType.Product, name: 'アドオン' });
if (AVAILABLE_PRODUCT_TYPES.includes(exports.ProductType.MembershipService)) {
    types.push({ codeValue: exports.ProductType.MembershipService, name: 'メンバーシップ' });
}
if (AVAILABLE_PRODUCT_TYPES.includes(exports.ProductType.PaymentCard)) {
    types.push({ codeValue: exports.ProductType.PaymentCard, name: 'ペイメントカード' });
}
exports.productTypes = types;
