import { chevre, factory } from '@cinerino/sdk';

type IAction = chevre.factory.action.IAction<chevre.factory.action.IAttributes<any, any, any>>;

/**
 * タイムラインインターフェース
 */
export interface ITimeline {
    action?: IAction;
    agent: {
        id: string;
        name: string;
        url?: string;
    };
    recipient?: {
        id: string;
        name: string;
        url?: string;
    };
    actionName: string;
    object: {
        name: string;
        url?: string;
    };
    purpose?: {
        name: string;
        url?: string;
    };
    startDate: Date;
    actionStatus: string;
    actionStatusDescription: string;
    result: any;
    location?: { name: string };
}

function createAgent(params: {
    project: { id: string };
    action: IAction;
}): {
    id: string;
    name: string;
    url?: string;
} {
    const a = params.action;

    let agent: {
        id: string;
        name: string;
        url?: string;
    } = {
        id: '',
        name: 'Unknown'
    };

    if (a.agent !== undefined && a.agent !== null) {
        switch (a.agent.typeOf) {
            case chevre.factory.personType.Person:
            case chevre.factory.creativeWorkType.WebApplication:
                // let userPoolId = '';
                // let tokenIssuer = '';
                // if (Array.isArray(a.agent.identifier)) {
                //     const tokenIssuerIdentifier = a.agent.identifier.find((i: any) => i.name === 'tokenIssuer');
                //     if (tokenIssuerIdentifier !== undefined) {
                //         tokenIssuer = tokenIssuerIdentifier.value;
                //         userPoolId = tokenIssuer.replace('https://cognito-idp.ap-northeast-1.amazonaws.com/', '');
                //     }
                // }

                const url = `/projects/${params.project.id}/resources/${a.agent.typeOf}/${a.agent.id}`;

                let agentName = (typeof a.agent.id === 'string') ? a.agent.id : a.agent.typeOf;
                if (typeof a.agent.name === 'string') {
                    agentName = a.agent.name;
                }

                agent = {
                    id: String(a.agent.id),
                    name: agentName,
                    url: url
                };

                break;

            case chevre.factory.organizationType.Corporation:
                agent = {
                    id: String(a.agent.id),
                    name: String(a.agent.name),
                    url: `/projects/${params.project.id}/sellers/${a.agent.id}`
                };
                break;

            case chevre.factory.organizationType.Project:
                agent = {
                    id: String(a.agent.id),
                    name: 'プロジェクト'
                };
                break;

            default:
                agent = {
                    id: a.agent.id,
                    name: (a.agent.name !== undefined && a.agent.name !== null)
                        ? (typeof a.agent.name === 'string') ? a.agent.name : String(a.agent.id)
                        : ''
                };
        }
    }

    return agent;
}

function createRecipient(params: {
    project: { id: string };
    action: IAction;
}): {
    id: string;
    name: string;
    url?: string;
} | undefined {
    const a = params.action;

    let recipient: {
        id: string;
        name: string;
        url?: string;
    } | undefined;

    if (a.recipient !== undefined && a.recipient !== null) {
        switch (a.recipient.typeOf) {
            case chevre.factory.personType.Person:
            case chevre.factory.creativeWorkType.WebApplication:
                // let userPoolId = '';
                // let tokenIssuer = '';
                // if (Array.isArray(a.recipient.identifier)) {
                //     const tokenIssuerIdentifier = a.recipient.identifier.find((i: any) => i.name === 'tokenIssuer');
                //     if (tokenIssuerIdentifier !== undefined) {
                //         tokenIssuer = tokenIssuerIdentifier.value;
                //         userPoolId = tokenIssuer.replace('https://cognito-idp.ap-northeast-1.amazonaws.com/', '');
                //     }
                // }

                const url = `/projects/${params.project.id}/resources/${a.recipient.typeOf}/${a.recipient.id}`;

                let recipientName = (typeof a.recipient.url === 'string') ? a.recipient.url
                    : (typeof a.recipient.id === 'string') ? a.recipient.id : a.recipient.typeOf;
                if (typeof a.recipient.name === 'string') {
                    recipientName = a.recipient.name;
                }

                recipient = {
                    id: String(a.recipient.id),
                    name: recipientName,
                    url: url
                };

                break;

            case chevre.factory.organizationType.Corporation:
                recipient = {
                    id: String(a.recipient.id),
                    name: String(a.recipient.name),
                    url: (typeof a.recipient.url === 'string') ? a.recipient.url : `/projects/${params.project.id}/sellers/${a.recipient.id}`

                };

                break;

            case chevre.factory.organizationType.Project:
                recipient = {
                    id: String(a.recipient.id),
                    name: 'プロジェクト'
                };
                break;

            default:
                recipient = {
                    id: a.recipient.id,
                    name: (a.recipient.name !== undefined && a.recipient.name !== null)
                        ? (typeof a.recipient.name === 'string') ? a.recipient.name : String(a.recipient.id)
                        : (typeof a.recipient.url === 'string') ? a.recipient.url : a.recipient.id,
                    url: a.recipient.url
                };
        }
    }

    return recipient;
}

function createLocation(params: {
    project: { id: string };
    action: IAction;
}) {
    const a = params.action;

    let location: {
        name: string;
    } | undefined;

    if (a.typeOf === chevre.factory.actionType.UseAction) {
        if (a.location !== undefined && a.location !== null) {
            location = {
                name: a.location?.identifier
            };
        }
    }

    return location;
}

// tslint:disable-next-line:cyclomatic-complexity
function createActionName(params: {
    project: { id: string };
    action: IAction;
}) {
    const a = params.action;

    let actionName: string;
    switch (a.typeOf) {
        case chevre.factory.actionType.AuthorizeAction:
            actionName = '承認';
            break;
        case chevre.factory.actionType.CancelAction:
            actionName = 'キャンセル';
            break;
        case chevre.factory.actionType.CheckAction:
            actionName = '確認';
            break;
        case chevre.factory.actionType.CreateAction:
            actionName = '作成';
            break;
        case chevre.factory.actionType.ConfirmAction:
            actionName = '確定';
            break;
        case chevre.factory.actionType.DeleteAction:
            actionName = '削除';
            break;
        case chevre.factory.actionType.GiveAction:
            actionName = '付与';
            break;
        case chevre.factory.actionType.InformAction:
            actionName = '通知';
            break;
        case chevre.factory.actionType.MoneyTransfer:
            actionName = '転送';
            break;
        case chevre.factory.actionType.OrderAction:
            actionName = '注文';
            break;
        case chevre.factory.actionType.PayAction:
            actionName = '決済';
            break;
        // case chevre.factory.actionType.PrintAction:
        //     actionName = '印刷';
        //     break;
        case chevre.factory.actionType.RefundAction:
            actionName = '返金';
            break;
        case chevre.factory.actionType.RegisterAction:
            actionName = '登録';
            break;
        case chevre.factory.actionType.ReserveAction:
            actionName = '予約';
            break;
        case chevre.factory.actionType.ReturnAction:
            if (a.object.typeOf === chevre.factory.order.OrderType.Order) {
                actionName = '返品';
            } else {
                actionName = '返却';
            }
            break;
        case chevre.factory.actionType.SendAction:
            if (a.object.typeOf === chevre.factory.order.OrderType.Order) {
                actionName = '配送';
            } else {
                actionName = '送信';
            }
            break;
        case chevre.factory.actionType.UnRegisterAction:
            actionName = '登録解除';
            break;
        case chevre.factory.actionType.UpdateAction:
            actionName = '更新';
            break;
        case chevre.factory.actionType.UseAction:
            actionName = '使用';
            break;
        default:
            actionName = a.typeOf;
    }

    return actionName;
}

function createObject(params: {
    project: { id: string };
    action: IAction;
}) {
    const a = params.action;

    let object: {
        name: string;
        url?: string;
    } = { name: 'Unknown' };

    try {
        if (a.object !== undefined && a.object !== null) {
            let url: string | undefined;
            if (typeof a.object.typeOf === 'string' && typeof a.object.id === 'string') {
                url = `/projects/${params.project.id}/resources/${a.object.typeOf}/${a.object.id}`;
            }

            object = { name: String(typeof a.object) };

            if (Array.isArray(a.object)) {
                if (typeof a.object[0]?.typeOf === 'string') {
                    object = { name: a.object[0].typeOf };

                    switch (a.object[0].typeOf) {
                        // case chevre.factory.chevre.offerType.Offer:
                        //     object = { name: `${a.object[0]?.itemOffered?.typeOf} オファー` };
                        //     break;
                        // case 'PaymentMethod':
                        //     object = { name: a.object[0].paymentMethod.name };
                        //     break;
                        // case chevre.factory.actionType.PayAction:
                        //     object = { name: a.object[0].object.paymentMethod.typeOf };
                        //     break;
                        default:
                    }
                }
            } else {
                object = { name: a.object.typeOf };

                switch (a.object.typeOf) {
                    // case chevre.factory.chevre.offerType.Offer:
                    //     object = { name: 'オファー' };
                    //     break;
                    // case chevre.factory.action.authorize.offer.seatReservation.ObjectType.SeatReservation:
                    //     object = { name: '予約' };
                    //     break;
                    // case chevre.factory.action.transfer.give.pointAward.ObjectType.PointAward:
                    // case chevre.factory.action.authorize.award.point.ObjectType.PointAward:
                    //     object = { name: 'ポイント特典' };
                    //     break;
                    case chevre.factory.order.OrderType.Order:
                        url = `/projects/${params.project.id}/orders/${a.object.orderNumber}`;
                        // object = { name: '注文' };
                        break;
                    // case 'OwnershipInfo':
                    //     object = { name: '所有権' };
                    //     break;
                    // case chevre.factory.creativeWorkType.EmailMessage:
                    //     object = { name: 'Eメール' };
                    //     break;
                    // case 'PaymentMethod':
                    //     object = { name: a.object.object[0].paymentMethod.name };
                    //     break;
                    // case chevre.factory.actionType.PayAction:
                    //     object = { name: a.object.object[0].paymentMethod.typeOf };
                    //     break;
                    // case chevre.factory.chevre.transactionType.Reserve:
                    //     object = { name: '予約取引' };
                    //     break;
                    // case chevre.factory.chevre.transactionType.MoneyTransfer:
                    //     object = { name: '通貨転送取引' };
                    //     break;
                    default:
                    // object = { name: a.object.typeOf };
                }
            }

            object.url = url;
        }
    } catch (error) {
        // no op
    }

    if (a.typeOf === chevre.factory.actionType.MoneyTransfer) {
        const amount = (<chevre.factory.action.transfer.moneyTransfer.IAction>a).amount;
        if (typeof amount === 'number') {
            object = { name: String(amount) };
        } else {
            object = { name: `${amount.value} ${amount.currency}` };
        }
    }

    return object;
}

function createPurpose(params: {
    project: { id: string };
    action: IAction;
}) {
    const a = params.action;

    let purpose: {
        name: string;
        url?: string;
    } | undefined;
    if (Array.isArray(a.purpose)) {
        purpose = { name: 'Array' };
    } else if (a.purpose !== undefined && a.purpose !== null) {
        purpose = { name: a.purpose.typeOf };

        switch (a.purpose.typeOf) {
            case chevre.factory.order.OrderType.Order:
                purpose.url = `/projects/${params.project.id}/orders/${(<factory.order.ISimpleOrder>a.purpose).orderNumber}`;
                break;

            case chevre.factory.transactionType.MoneyTransfer:
            case chevre.factory.transactionType.PlaceOrder:
            case chevre.factory.transactionType.ReturnOrder:
                purpose.url = `/projects/${params.project.id}/transactions/${a.purpose.typeOf}/${(<factory.transaction.ITransaction<factory.transactionType>>a.purpose).id}`;
                break;

            default:
        }
    }

    return purpose;
}

function createResult(params: {
    project: { id: string };
    action: IAction;
}) {
    const a = params.action;

    let result: any;
    if (a.result !== undefined && a.result !== null) {
        switch (a.typeOf) {
            case chevre.factory.actionType.SendAction:
                if (a.object.typeOf === chevre.factory.order.OrderType.Order) {
                    if (Array.isArray(a.result)) {
                        result = a.result.map((o: any) => {
                            return {
                                name: '所有権',
                                url: `/projects/${params.project.id}/resources/${o.typeOf}/${o.id}`
                            };
                        });
                    } else if (Array.isArray(a.result.ownershipInfos)) {
                        result = a.result.ownershipInfos.map((o: any) => {
                            return {
                                name: '所有権',
                                url: `/projects/${params.project.id}/resources/${o.typeOf}/${o.id}`
                            };
                        });
                    }
                }

                break;

            case chevre.factory.actionType.ReturnAction:
                if (a.object.typeOf === chevre.factory.order.OrderType.Order) {
                    if (Array.isArray(a.result)) {
                        result = a.result.map((o: any) => {
                            return {
                                name: '所有権',
                                url: `/projects/${params.project.id}/resources/${o.typeOf}/${o.id}`
                            };
                        });
                    }
                }

                break;

            case chevre.factory.actionType.AuthorizeAction:
                if (a.object.typeOf === 'OwnershipInfo') {
                    if (typeof a.result.code === 'string') {
                        result = [{
                            name: '所有権コード',
                            url: `/projects/${params.project.id}/authorizations/${a.result.id}`
                        }];
                    }
                }

                break;

            default:
        }
    }

    return result;
}

function createActionStatusDescription(params: {
    project: { id: string };
    action: IAction;
}) {
    const a = params.action;

    let actionStatusDescription: string;
    switch (a.actionStatus) {
        case chevre.factory.actionStatusType.ActiveActionStatus:
            actionStatusDescription = 'しようとしています...';
            break;
        case chevre.factory.actionStatusType.CanceledActionStatus:
            actionStatusDescription = 'しましたが、取り消しました';
            break;
        case chevre.factory.actionStatusType.CompletedActionStatus:
            actionStatusDescription = 'しました';
            break;
        case chevre.factory.actionStatusType.FailedActionStatus:
            actionStatusDescription = 'しようとしましたが、失敗しました';
            break;
        case chevre.factory.actionStatusType.PotentialActionStatus:
            actionStatusDescription = 'する可能性があります';
            break;
        default:
            actionStatusDescription = a.actionStatus;
    }

    return actionStatusDescription;
}

export function createFromAction(params: {
    project: { id: string };
    action: IAction;
}): ITimeline {
    const a = params.action;

    const agent = createAgent(params);
    const recipient = createRecipient(params);
    const location = createLocation(params);
    const actionName = createActionName(params);
    const object = createObject(params);
    const purpose = createPurpose(params);
    const result = createResult(params);
    const actionStatusDescription = createActionStatusDescription(params);

    return {
        action: a,
        agent,
        recipient,
        actionName,
        object,
        purpose,
        startDate: a.startDate,
        actionStatus: a.actionStatus,
        actionStatusDescription: actionStatusDescription,
        result,
        ...(location !== undefined) ? { location } : undefined
    };
}
