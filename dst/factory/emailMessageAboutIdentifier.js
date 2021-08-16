"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailMessageAboutIdentifier = void 0;
const sdk_1 = require("@cinerino/sdk");
const sets = [
    { identifier: sdk_1.chevre.factory.creativeWork.message.email.AboutIdentifier.OnEventStatusChanged, name: 'イベントステータス変更' },
    { identifier: sdk_1.chevre.factory.creativeWork.message.email.AboutIdentifier.OnOrderRefunded, name: '返金' },
    { identifier: sdk_1.chevre.factory.creativeWork.message.email.AboutIdentifier.OnOrderReturned, name: '返品' },
    { identifier: sdk_1.chevre.factory.creativeWork.message.email.AboutIdentifier.OnOrderSent, name: '注文配送' }
];
exports.emailMessageAboutIdentifier = sets;
