import { chevre } from '@cinerino/sdk';

export interface IReturnFeesEnumerationType {
    codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration;
    name: string;
}
const types: IReturnFeesEnumerationType[] = [
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.FreeReturn, name: '着券を取り消す' },
    { codeValue: chevre.factory.merchantReturnPolicy.ReturnFeesEnumeration.ReturnFeesCustomerResponsibility, name: '着券を取り消さない' }
];
export const returnFeesEnumerationMovieTicketTypes = types;
