"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountStatusTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.accountStatusType.Closed, name: '解約済' },
    { codeValue: sdk_1.chevre.factory.accountStatusType.Opened, name: '開設済' }
];
exports.accountStatusTypes = types;
