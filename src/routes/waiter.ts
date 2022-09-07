/**
 * Waiterルーター
 */
import * as express from 'express';
import * as moment from 'moment';
import * as request from 'request-promise-native';

const waiterRouter = express.Router();

waiterRouter.get(
    '/rules',
    async (req, res, next) => {
        try {
            if (req.query.format === 'datatable') {
                const rules = <any[]>await request.get(
                    `${process.env.WAITER_ENDPOINT}/projects/${req.project.id}/rules`,
                    { json: true }
                )
                    .promise();

                res.json({
                    success: true,
                    count: rules.length,
                    results: rules.map((rule) => {
                        return {
                            ...rule,
                            numAvailableHoursSpecifications: (Array.isArray(rule.availableHoursSpecifications))
                                ? rule.availableHoursSpecifications.length
                                : 0,
                            numUnavailableHoursSpecifications: (Array.isArray(rule.unavailableHoursSpecifications))
                                ? rule.unavailableHoursSpecifications.length
                                : 0
                        };
                    })
                });
            } else {
                res.render('waiter/rules', {
                    moment: moment
                });
            }
        } catch (error) {
            next(error);
        }
    }
);
export { waiterRouter };
