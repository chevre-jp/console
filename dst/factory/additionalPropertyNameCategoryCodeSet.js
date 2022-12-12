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
];
exports.additionalPropertyNameCategoryCodeSet = sets;
