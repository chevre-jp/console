"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnFeesEnumerationTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn, name: '手数料なしで返金する' },
    { codeValue: sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.RestockingFees, name: '手数料ありで返金する' },
    { codeValue: sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility, name: '返金しない' }
];
exports.returnFeesEnumerationTypes = types;
