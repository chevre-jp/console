"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountStatusTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.account.AccountStatusType.Closed, name: '解約済' },
    { codeValue: sdk_1.chevre.factory.account.AccountStatusType.Opened, name: '開設済' }
];
exports.accountStatusTypes = types;
