"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservationTypes = void 0;
const sdk_1 = require("@cinerino/sdk");
const types = [
    { codeValue: sdk_1.chevre.factory.reservationType.EventReservation, name: '興行予約' },
    { codeValue: sdk_1.chevre.factory.reservationType.BusReservation, name: '旅客予約' }
];
exports.reservationTypes = types;
