import { chevre } from '@cinerino/sdk';

export interface IEmailMessageAboutIdentifier {
    identifier: chevre.factory.creativeWork.message.email.AboutIdentifier;
    name: string;
}

const sets: IEmailMessageAboutIdentifier[] = [
    { identifier: chevre.factory.creativeWork.message.email.AboutIdentifier.OnEventStatusChanged, name: 'イベントステータス変更' },
    { identifier: chevre.factory.creativeWork.message.email.AboutIdentifier.OnOrderRefunded, name: '返金' },
    { identifier: chevre.factory.creativeWork.message.email.AboutIdentifier.OnOrderReturned, name: '返品' },
    { identifier: chevre.factory.creativeWork.message.email.AboutIdentifier.OnOrderSent, name: '注文配送' }
];

export const emailMessageAboutIdentifier = sets;
