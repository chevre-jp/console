import { chevre } from '@cinerino/sdk';

export interface IAvailability {
    codeValue: chevre.factory.itemAvailability;
    name: string;
}

const availabilities: IAvailability[] = [
    // { codeValue: chevre.factory.itemAvailability.InStock, name: '在庫あり' },
    // { codeValue: chevre.factory.itemAvailability.InStoreOnly, name: '店舗のみ' },
    // { codeValue: chevre.factory.itemAvailability.OnlineOnly, name: 'オンラインのみ' },
    // { codeValue: chevre.factory.itemAvailability.OutOfStock, name: '在庫なし' }
];

export const itemAvailabilities = availabilities;
