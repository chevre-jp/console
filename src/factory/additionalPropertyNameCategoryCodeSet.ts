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
];

export const additionalPropertyNameCategoryCodeSet = sets;
