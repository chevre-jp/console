"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderStatusTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.orderStatus.OrderDelivered, name: '配送済' },
    { codeValue: sdk_1.chevre.factory.orderStatus.OrderProcessing, name: '処理中' },
    { codeValue: sdk_1.chevre.factory.orderStatus.OrderReturned, name: '返品済' }
];
exports.orderStatusTypes = types;
