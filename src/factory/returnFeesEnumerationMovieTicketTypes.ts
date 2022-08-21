import { chevre } from '@cinerino/sdk';

export interface IReturnFeesEnumerationType {
    codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration;
    name: string;
}
const types: IReturnFeesEnumerationType[] = [
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn, name: '着券取消を実行する' },
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility, name: '着券取消を実行しない' }
];
export const returnFeesEnumerationMovieTicketTypes = types;
