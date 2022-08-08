import { chevre } from '@cinerino/sdk';

export interface IReturnFeesEnumerationType {
    codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration;
    name: string;
}
const types: IReturnFeesEnumerationType[] = [
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn, name: '手数料なしで返金' },
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.RestockingFees, name: '手数料ありで返金' },
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility, name: '返金しない' }
];
export const returnFeesEnumerationTypes = types;
