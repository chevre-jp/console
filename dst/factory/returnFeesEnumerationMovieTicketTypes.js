"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnFeesEnumerationMovieTicketTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn, name: '着券取消を実行する' },
    { codeValue: sdk_1.chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility, name: '着券取消を実行しない' }
];
exports.returnFeesEnumerationMovieTicketTypes = types;
