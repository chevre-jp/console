"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceSpecificationTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.priceSpecificationType.CategoryCodeChargeSpecification, name: '区分加算料金' },
    { codeValue: sdk_1.chevre.factory.priceSpecificationType.MovieTicketTypeChargeSpecification, name: '決済カード加算料金' }
];
exports.priceSpecificationTypes = types;
