/**
 * サブスクリプションインターフェース
 */
export interface ISubscription {
    identifier: string;
    useEventServiceAsProduct: boolean;
    settings: {
        allowNoCapacity: boolean;
        maximumAttendeeCapacity: number;
        useAdvancedScheduling: boolean;
        useSeats: boolean;
        useProducts: boolean;
        usePriceSpecifications: boolean;
        useAccountTitles: boolean;
    };
}
