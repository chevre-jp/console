/**
 * 経理レポートルーター
 */
import { chevre } from '@cinerino/sdk';
import { Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';
import * as moment from 'moment-timezone';

const accountingReportsRouter = Router();

accountingReportsRouter.get(
    '',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const accountingReportService = new chevre.service.AccountingReport({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: any = {
                limit: req.query.limit,
                page: req.query.page
            };

            if (req.query.format === 'datatable') {
                const conditions: chevre.factory.report.accountingReport.ISearchConditions = {
                    limit: Number(searchConditions.limit),
                    page: Number(searchConditions.page),
                    project: { id: { $eq: req.project.id } },
                    order: {
                        ...(typeof req.query.orderNumber === 'string' && req.query.orderNumber.length > 0)
                            ? { orderNumber: { $eq: req.query.orderNumber } }
                            : undefined,
                        paymentMethods: {
                            ...(typeof req.query.paymentMethodId === 'string' && req.query.paymentMethodId.length > 0)
                                ? { paymentMethodId: { $eq: req.query.paymentMethodId } }
                                : undefined
                        },
                        orderDate: {
                            $gte: (typeof req.query.orderFrom === 'string' && req.query.orderFrom.length > 0)
                                ? moment(`${String(req.query.orderFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                                    .toDate()
                                : undefined,
                            $lte: (typeof req.query.orderThrough === 'string' && req.query.orderThrough.length > 0)
                                ? moment(`${String(req.query.orderThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                                    .add(1, 'day')
                                    .toDate()
                                : undefined
                        },
                        acceptedOffers: {
                            itemOffered: {
                                reservationFor: {
                                    startDate: {
                                        $gte: (typeof req.query.reservationForStartFrom === 'string'
                                            && req.query.reservationForStartFrom.length > 0)
                                            ? moment(`${String(req.query.reservationForStartFrom)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                                                .toDate()
                                            : undefined,
                                        $lte: (typeof req.query.reservationForStartThrough === 'string'
                                            && req.query.reservationForStartThrough.length > 0)
                                            ? moment(`${String(req.query.reservationForStartThrough)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                                                .add(1, 'day')
                                                .toDate()
                                            : undefined
                                    }
                                }
                            }
                        },
                        ...{
                            seller: {
                                ...(typeof req.query.seller?.id === 'string' && req.query.seller.id.length > 0)
                                    ? { id: { $eq: req.query.seller.id } }
                                    : undefined
                            }
                        }
                    },
                    ...(req.query.unwindAcceptedOffers === '1') ? { $unwindAcceptedOffers: '1' } : undefined
                };
                const searchResult = await accountingReportService.search(conditions);

                searchResult.data = searchResult.data.map((a) => {
                    const order = a.isPartOf.mainEntity;

                    let clientId = '';
                    if (Array.isArray(order.customer.identifier)) {
                        const clientIdPropertyValue = order.customer.identifier.find((p) => p.name === 'clientId')?.value;
                        if (typeof clientIdPropertyValue === 'string') {
                            clientId = clientIdPropertyValue;
                        }
                    }

                    let itemType: string[] = [];
                    let itemTypeStr: string = '';
                    if (Array.isArray(order.acceptedOffers) && order.acceptedOffers.length > 0) {
                        itemTypeStr = order.acceptedOffers[0].itemOffered.typeOf;
                        itemTypeStr += ` x ${order.acceptedOffers.length}`;
                        itemType = order.acceptedOffers.map((o) => o.itemOffered.typeOf);
                    } else if (!Array.isArray(order.acceptedOffers) && typeof (<any>order.acceptedOffers).typeOf === 'string') {
                        itemType = [(<any>order.acceptedOffers).itemOffered.typeOf];
                        itemTypeStr = (<any>order.acceptedOffers).itemOffered.typeOf;
                    }
                    if (a.mainEntity.typeOf === chevre.factory.actionType.PayAction
                        && a.mainEntity.purpose.typeOf === chevre.factory.actionType.ReturnAction) {
                        itemType = ['ReturnFee'];
                        itemTypeStr = 'ReturnFee';
                    }

                    // let amount;
                    // if (typeof (<any>a).object?.paymentMethod?.totalPaymentDue?.value === 'number') {
                    //     amount = (<any>a).object.paymentMethod.totalPaymentDue.value;
                    // }

                    let eventStartDates: Date[] = [];
                    if (Array.isArray(order.acceptedOffers)) {
                        eventStartDates = order.acceptedOffers
                            .filter((o) => o.itemOffered.typeOf === chevre.factory.reservationType.EventReservation)
                            .map((o) => (<chevre.factory.order.IReservation>o.itemOffered).reservationFor.startDate);
                        eventStartDates = [...new Set(eventStartDates)];
                    } else if ((<any>order.acceptedOffers)?.itemOffered?.typeOf
                        === chevre.factory.reservationType.EventReservation) {
                        eventStartDates = [(<any>order.acceptedOffers).itemOffered.reservationFor.startDate];
                    }

                    return {
                        ...a,
                        // amount,
                        itemType,
                        itemTypeStr,
                        eventStartDates,
                        eventStartDatesStr: eventStartDates.map((d) => {
                            return moment(d)
                                .tz('Asia/Tokyo')
                                .format('YY-MM-DD HH:mm:ssZ');
                        })
                            .join(','),
                        clientId
                    };
                });

                res.json({
                    success: true,
                    count: (searchResult.data.length === Number(searchConditions.limit))
                        ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                        : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(searchResult.data.length),
                    results: searchResult.data
                });
                // } else if (req.query.format === chevreapi.factory.chevre.encodingFormat.Text.csv) {
                //     const stream = <NodeJS.ReadableStream>await streamingOrderService.download({
                //         ...searchConditions,
                //         format: chevreapi.factory.chevre.encodingFormat.Text.csv,
                //         limit: undefined,
                //         page: undefined
                //     });
                //     const filename = 'OrderReport';
                //     res.setHeader('Content-disposition', `attachment; filename*=UTF-8\'\'${encodeURIComponent(`${filename}.csv`)}`);
                //     res.setHeader('Content-Type', `${chevreapi.factory.chevre.encodingFormat.Text.csv}; charset=UTF-8`);
                //     stream.pipe(res);
                // } else if (req.query.format === chevreapi.factory.chevre.encodingFormat.Application.json) {
                //     const stream = <NodeJS.ReadableStream>await streamingOrderService.download({
                //         ...searchConditions,
                //         format: chevreapi.factory.chevre.encodingFormat.Application.json,
                //         limit: undefined,
                //         page: undefined
                //     });
                //     const filename = 'OrderReport';
                //     res.setHeader('Content-disposition', `attachment; filename*=UTF-8\'\'${encodeURIComponent(`${filename}.json`)}`);
                //     res.setHeader('Content-Type', `${chevreapi.factory.chevre.encodingFormat.Application.json}; charset=UTF-8`);
                //     stream.pipe(res);
            } else {
                res.render('accountingReports/index', {
                    moment: moment,
                    query: req.query,
                    searchConditions: searchConditions
                    // extractScripts: true
                });
            }
        } catch (error) {
            if (req.query.format === 'datatable') {
                res.status((typeof error.code === 'number') ? error.code : INTERNAL_SERVER_ERROR)
                    .json({ message: error.message });
            } else {
                next(error);
            }
        }
    }
);

export default accountingReportsRouter;
