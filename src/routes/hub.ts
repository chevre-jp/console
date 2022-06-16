/**
 * HUBルーター
 */
import * as express from 'express';
import * as moment from 'moment';
import * as request from 'request-promise-native';

const hubRouter = express.Router();

hubRouter.get(
    '/chevres',
    async (req, res, next) => {
        try {
            if (req.query.format === 'datatable') {
                const limit = Number(req.query.limit);
                const page = Number(req.query.page);

                const searchConditions: any = {
                    limit: limit,
                    page: page,
                    id: {
                        $eq: (typeof req.query.id?.$eq === 'string' && req.query.id.$eq.length > 0)
                            ? req.query.id.$eq
                            : undefined
                    }
                };

                const chevres = <any[]>await request.get(
                    `${process.env.HUB_ENDPOINT}/chevres`,
                    { json: true, qs: searchConditions }
                )
                    .promise();

                res.json({
                    success: true,
                    count: (chevres.length === Number(limit))
                        ? (Number(page) * Number(limit)) + 1
                        : ((Number(page) - 1) * Number(limit)) + Number(chevres.length),
                    results: chevres.map((chevre) => {
                        return {
                            ...chevre
                        };
                    })
                });
            } else {
                res.render('hub/chevres', {
                    moment: moment
                });
            }
        } catch (error) {
            next(error);
        }
    }
);
export { hubRouter };
