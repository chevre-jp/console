/**
 * デフォルトルーター
 */
import * as express from 'express';

import authentication from '../middlewares/authentication';

import accountTitlesRouter from './accountTitles';
import addOnsRouter from './addOns';
import authRouter from './auth';
import categoryCodesRouter from './categoryCode';
import movieRouter from './creativeWork/movie';
import dashboardRouter from './dashboard';
import screeningEventRouter from './event/screeningEvent';
import screeningEventSeriesRouter from './event/screeningEventSeries';
import homeRouter from './home';
import movieTheaterRouter from './places/movieTheater';
import screeningRoomRouter from './places/screeningRoom';
import priceSpecificationsRouter from './priceSpecifications';
import productsRouter from './products';
import reservationsRouter from './reservations';
import serviceTypesRouter from './serviceTypes';
import ticketTypeMasterRouter from './ticketType';
import ticketTypeGroupMasterRouter from './ticketTypeGroup';

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
router.use('/addOns', addOnsRouter);
router.use('/categoryCodes', categoryCodesRouter);
router.use('/creativeWorks/movie', movieRouter);
router.use('/events/screeningEvent', screeningEventRouter);
router.use('/events/screeningEventSeries', screeningEventSeriesRouter);
router.use('/places/movieTheater', movieTheaterRouter);
router.use('/places/screeningRoom', screeningRoomRouter);
router.use('/priceSpecifications', priceSpecificationsRouter);
router.use('/products', productsRouter);
router.use('/reservations', reservationsRouter);
router.use('/serviceTypes', serviceTypesRouter);
router.use('/ticketTypes', ticketTypeMasterRouter);
router.use('/ticketTypeGroups', ticketTypeGroupMasterRouter);

export default router;
