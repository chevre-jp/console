/**
 * デフォルトルーター
 */
import * as express from 'express';

import authentication from '../middlewares/authentication';

import accountTitlesRouter from './accountTitles';
import applicationsRouter from './applications';
import authRouter from './auth';
import categoryCodesRouter from './categoryCode';
import movieRouter from './creativeWork/movie';
import dashboardRouter from './dashboard';
import screeningEventRouter from './event/screeningEvent';
import screeningEventSeriesRouter from './event/screeningEventSeries';
import homeRouter from './home';
import offerCatalogsRouter from './offerCatalogs';
import offersRouter from './offers';
import movieTheaterRouter from './places/movieTheater';
import screeningRoomRouter from './places/screeningRoom';
import seatRouter from './places/seat';
import priceSpecificationsRouter from './priceSpecifications';
import productsRouter from './products';
import reservationsRouter from './reservations';
import servicesRouter from './services';
import ticketTypeMasterRouter from './ticketType';
import transactionsRouter from './transactions';

const router = express.Router();

router.use(authRouter);
router.use(authentication);

router.use('/', dashboardRouter);

// プロジェクト決定
router.use((req, res, next) => {
    // セッションにプロジェクトIDがあればリクエストプロジェクトに設定
    if (typeof (<any>req.session).projectId === 'string') {
        req.project = {
            typeOf: 'Project',
            id: (<any>req.session).projectId
        };
    } else {
        res.redirect('/');

        return;
    }

    next();
});

router.use('/home', homeRouter);
router.use('/accountTitles', accountTitlesRouter);
router.use('/applications', applicationsRouter);
router.use('/categoryCodes', categoryCodesRouter);
router.use('/creativeWorks/movie', movieRouter);
router.use('/events/screeningEvent', screeningEventRouter);
router.use('/events/screeningEventSeries', screeningEventSeriesRouter);
router.use('/offerCatalogs', offerCatalogsRouter);
router.use('/offers', offersRouter);
router.use('/places/movieTheater', movieTheaterRouter);
router.use('/places/screeningRoom', screeningRoomRouter);
router.use('/places/seat', seatRouter);
router.use('/priceSpecifications', priceSpecificationsRouter);
router.use('/products', productsRouter);
router.use('/reservations', reservationsRouter);
router.use('/services', servicesRouter);
router.use('/ticketTypes', ticketTypeMasterRouter);
router.use('/transactions', transactionsRouter);

export default router;
