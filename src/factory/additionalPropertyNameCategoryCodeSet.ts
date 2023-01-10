import { chevre } from '@cinerino/sdk';

export interface ICategoryCodeSet {
    identifier: string;
    name: string;
    // description: string;
}
const sets: ICategoryCodeSet[] = [
    {
        identifier: chevre.factory.eventType.ScreeningEventSeries,
        name: '施設コンテンツ'
    },
    {
        identifier: chevre.factory.eventType.ScreeningEvent,
        name: 'スケジュール'
    }
    // tslint:disable-next-line:no-suspicious-comment
    // TODO 施設機能を追加
];

export const additionalPropertyNameCategoryCodeSet = sets;
