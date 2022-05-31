import { chevre } from '@cinerino/sdk';

export interface IAccountStatusType {
    codeValue: chevre.factory.account.AccountStatusType;
    name: string;
}

const types: IAccountStatusType[] = [
    { codeValue: chevre.factory.account.AccountStatusType.Closed, name: '解約済' },
    { codeValue: chevre.factory.account.AccountStatusType.Opened, name: '開設済' }
];

export const accountStatusTypes = types;
