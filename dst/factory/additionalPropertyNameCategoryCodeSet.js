"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.additionalPropertyNameCategoryCodeSet = void 0;
const sdk_1 = require("@cinerino/sdk");
const sets = [
    {
        identifier: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
        name: '施設コンテンツ'
    },
    {
        identifier: sdk_1.chevre.factory.eventType.ScreeningEvent,
        name: 'スケジュール'
    }
    // tslint:disable-next-line:no-suspicious-comment
    // TODO 施設機能を追加
];
exports.additionalPropertyNameCategoryCodeSet = sets;
