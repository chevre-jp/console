/**
 * アクションルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
import { INTERNAL_SERVER_ERROR } from 'http-status';

const actionsRouter = Router();

actionsRouter.get(
    '',
    async (__, res) => {
        res.render('actions/index', {
            message: '',
            ActionType: chevre.factory.actionType,
            ActionStatusType: chevre.factory.actionStatusType
        });
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createSearchConditions(req: Request): chevre.factory.action.ISearchConditions {
    const paymentMethodAccountIdEq = req.query.object?.paymentMethod?.accountId?.$eq;
    const paymentMethodPaymentMethodIdEq = req.query.object?.paymentMethod?.paymentMethodId?.$eq;
    const paymentMethodTypeEq = req.query.object?.paymentMethod?.typeOf?.$eq;
    const paymentMethodIdEq = req.query.object?.paymentMethodId?.$eq;
    const objectObjectPaymentMethodIdEq = req.query.object?.object?.paymentMethodId?.$eq;

    return {
        limit: req.query.limit,
        page: req.query.page,
        project: { id: { $eq: req.project.id } },
        agent: {
            id: {
                $in: (typeof req.query.agent?.id?.$eq === 'string' && req.query.agent.id.$eq.length > 0)
                    ? [req.query.agent.id.$eq]
                    : undefined
            },
            typeOf: {
                $in: (typeof req.query.agent?.typeOf?.$eq === 'string' && req.query.agent.typeOf.$eq.length > 0)
                    ? [req.query.agent.typeOf.$eq]
                    : undefined
            }
        },
        typeOf: {
            $eq: (typeof req.query.typeOf?.$eq === 'string' && req.query.typeOf.$eq.length > 0)
                ? req.query.typeOf.$eq
                : undefined
        },
        actionStatus: {
            $in: (typeof req.query.actionStatus?.$eq === 'string' && req.query.actionStatus.$eq.length > 0)
                ? [req.query.actionStatus.$eq]
                : undefined
        },
        location: {
            id: {
                $eq: (typeof req.query.location?.id?.$eq === 'string' && req.query.location.id.$eq.length > 0)
                    ? req.query.location.id.$eq
                    : undefined
            },
            identifier: {
                $eq: (typeof req.query.location?.identifier?.$eq === 'string' && req.query.location.identifier.$eq.length > 0)
                    ? req.query.location.identifier.$eq
                    : undefined
            }
        },
        object: {
            event: {
                id: {
                    $in: (typeof req.query.object?.event?.id?.$eq === 'string'
                        && req.query.object.event.id.$eq.length > 0)
                        ? [req.query.object.event.id.$eq]
                        : undefined
                }
            },
            reservationFor: {
                id: {
                    $eq: (typeof req.query.object?.reservationFor?.id?.$eq === 'string'
                        && req.query.object.reservationFor.id.$eq.length > 0)
                        ? req.query.object.reservationFor.id.$eq
                        : undefined
                }
            },
            paymentMethod: {
                accountId: {
                    $eq: (typeof paymentMethodAccountIdEq === 'string' && paymentMethodAccountIdEq.length > 0)
                        ? paymentMethodAccountIdEq
                        : undefined
                },
                paymentMethodId: {
                    $eq: (typeof paymentMethodPaymentMethodIdEq === 'string' && paymentMethodPaymentMethodIdEq.length > 0)
                        ? paymentMethodPaymentMethodIdEq
                        : undefined
                },
                typeOf: {
                    $eq: (typeof paymentMethodTypeEq === 'string' && paymentMethodTypeEq.length > 0)
                        ? paymentMethodTypeEq
                        : undefined
                }
            },
            paymentMethodId: {
                $eq: (typeof paymentMethodIdEq === 'string' && paymentMethodIdEq.length > 0)
                    ? paymentMethodIdEq
                    : undefined
            },
            typeOf: {
                $eq: (typeof req.query.object?.typeOf?.$eq === 'string' && req.query.object.typeOf.$eq.length > 0)
                    ? req.query.object.typeOf.$eq
                    : undefined
            },
            id: {
                $eq: (typeof req.query.object?.id?.$eq === 'string' && req.query.object.id.$eq.length > 0)
                    ? req.query.object.id.$eq
                    : undefined
            },
            orderNumber: {
                $in: (typeof req.query.object?.orderNumber?.$eq === 'string' && req.query.object.orderNumber.$eq.length > 0)
                    ? [req.query.object.orderNumber.$eq]
                    : undefined
            },
            acceptedOffer: {
                ticketedSeat: {
                    seatNumber: {
                        $in: (typeof req.query.object?.acceptedOffer?.ticketedSeat?.seatNumber?.$eq === 'string'
                            && req.query.object.acceptedOffer.ticketedSeat.seatNumber.$eq.length > 0)
                            ? [req.query.object.acceptedOffer.ticketedSeat.seatNumber.$eq]
                            : undefined
                    }
                }
            },
            object: {
                paymentMethodId: {
                    $eq: (typeof objectObjectPaymentMethodIdEq === 'string' && objectObjectPaymentMethodIdEq.length > 0)
                        ? objectObjectPaymentMethodIdEq
                        : undefined
                }
            }
        },
        purpose: {
            typeOf: {
                $in: (typeof req.query.purpose?.typeOf?.$eq === 'string' && req.query.purpose.typeOf.$eq.length > 0)
                    ? [req.query.purpose.typeOf.$eq]
                    : undefined
            },
            id: {
                $in: (typeof req.query.purpose?.id?.$eq === 'string' && req.query.purpose.id.$eq.length > 0)
                    ? [req.query.purpose.id.$eq]
                    : undefined
            },
            orderNumber: {
                $in: (typeof req.query.purpose?.orderNumber?.$eq === 'string' && req.query.purpose.orderNumber.$eq.length > 0)
                    ? [req.query.purpose.orderNumber.$eq]
                    : undefined
            }
        },
        result: {
            typeOf: {
                $in: (typeof req.query.result?.typeOf?.$eq === 'string' && req.query.result.typeOf.$eq.length > 0)
                    ? [req.query.result.typeOf.$eq]
                    : undefined
            },
            id: {
                $in: (typeof req.query.result?.id?.$eq === 'string' && req.query.result.id.$eq.length > 0)
                    ? [req.query.result.id.$eq]
                    : undefined
            },
            orderNumber: {
                $in: (typeof req.query.result?.orderNumber?.$eq === 'string' && req.query.result.orderNumber.$eq.length > 0)
                    ? [req.query.result.orderNumber.$eq]
                    : undefined
            }
        },
        fromLocation: {
            accountNumber: {
                $in: (typeof req.query.fromLocation?.accountNumber?.$eq === 'string'
                    && req.query.fromLocation.accountNumber.$eq.length > 0)
                    ? [req.query.fromLocation.accountNumber.$eq]
                    : undefined
            }
        },
        toLocation: {
            accountNumber: {
                $in: (typeof req.query.toLocation?.accountNumber?.$eq === 'string'
                    && req.query.toLocation.accountNumber.$eq.length > 0)
                    ? [req.query.toLocation.accountNumber.$eq]
                    : undefined
            }
        }
    };
}

actionsRouter.get(
    '/search',
    async (req, res) => {
        try {
            const actionService = new chevre.service.Action({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions = createSearchConditions(req);
            const { data } = await actionService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((a) => {

                    const objectType = (Array.isArray(a.object)) ? a.object[0]?.typeOf : a.object.typeOf;
                    const objectId = (Array.isArray(a.object)) ? a.object[0]?.id : a.object.id;
                    const resultType = (a.result !== undefined && a.result !== null) ? '表示' : '';
                    const errorType = (a.error !== undefined && a.error !== null) ? '表示' : '';
                    const purposeType = (a.purpose !== undefined && a.purpose !== null)
                        ? String(a.purpose.typeOf)
                        : '';
                    const instrumentType = (a.instrument !== undefined && a.instrument !== null)
                        ? String(a.instrument.typeOf)
                        : '';

                    return {
                        ...a,
                        objectType,
                        objectId,
                        resultType,
                        errorType,
                        purposeType,
                        instrumentType
                    };
                })
            });
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    count: 0,
                    results: []
                });
        }
    }
);

export { actionsRouter };
