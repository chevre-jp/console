import { chevre } from '@cinerino/sdk';

export interface IReservationType {
    codeValue: chevre.factory.reservationType;
    name: string;
}

const types: IReservationType[] = [
    { codeValue: chevre.factory.reservationType.EventReservation, name: '興行予約' },
    { codeValue: chevre.factory.reservationType.BusReservation, name: '旅客予約' }
];

export const reservationTypes = types;
