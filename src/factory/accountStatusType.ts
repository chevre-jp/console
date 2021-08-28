import { chevre } from '@cinerino/sdk';

export interface IAccountStatusType {
    codeValue: chevre.factory.accountStatusType;
    name: string;
}

const types: IAccountStatusType[] = [
    { codeValue: chevre.factory.accountStatusType.Closed, name: '解約済' },
    { codeValue: chevre.factory.accountStatusType.Opened, name: '開設済' }
];

export const accountStatusTypes = types;
