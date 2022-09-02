import { chevre } from '@cinerino/sdk';

export interface IOrderStatusType {
    codeValue: chevre.factory.orderStatus;
    name: string;
}

const types: IOrderStatusType[] = [
    { codeValue: chevre.factory.orderStatus.OrderDelivered, name: '配送済' },
    { codeValue: chevre.factory.orderStatus.OrderProcessing, name: '処理中' },
    { codeValue: chevre.factory.orderStatus.OrderReturned, name: '返品済' }
];

export const orderStatusTypes = types;
