/**
 * プロジェクト詳細ルーター
 */
import * as express from 'express';

import accountActionsRouter from '../accountActions';
import accountingReportsRouter from '../accountingReports';
import accountsRouter from '../accounts';
import accountStatusTypesRouter from '../accountStatusTypes';
import accountTitlesRouter from '../accountTitles';
import actionsRouter from '../actions';
import applicationsRouter from '../applications';
import assetTransactionsRouter from '../assetTransactions';
import authorizationsRouter from '../authorizations';
import categoryCodesRouter from '../categoryCode';
import categoryCodeSetsRouter from '../categoryCodeSets';
import creativeWorksRouter from '../creativeWorks';
import customersRouter from '../customers';
import emailMessageAboutIdentifiersRouter from '../emailMessageAboutIdentifiers';
import emailMessagesRouter from '../emailMessages';
import screeningEventRouter from '../event/screeningEvent';
import screeningEventSeriesRouter from '../event/screeningEventSeries';
import homeRouter from '../home';
import iamMembersRouter from '../iam/members';
import iamRolesRouter from '../iam/roles';
import offerCatalogsRouter from '../offerCatalogs';
import offersRouter from '../offers';
import ordersRouter from '../orders';
import ownershipInfosRouter from '../ownershipInfos';
import movieTicketPaymentMethodRouter from '../paymentMethods/movieTicket';
import paymentServicesRouter from '../paymentServices';
import peopleRouter from '../people';
import permitsRouter from '../permits';
import movieTheaterRouter from '../places/movieTheater';
import screeningRoomRouter from '../places/screeningRoom';
import screeningRoomSectionRouter from '../places/screeningRoomSection';
import seatRouter from '../places/seat';
import priceSpecificationsRouter from '../priceSpecifications';
import productsRouter from '../products';
import reservationsRouter from '../reservations';
import sellersRouter from '../sellers';
import settingsRouter from '../settings';
import tasksRouter from '../tasks';
import ticketTypeMasterRouter from '../ticketType';
import transactionsRouter from '../transactions';
import waiterRouter from '../waiter';

const projectDetailRouter = express.Router();

projectDetailRouter.use('/home', homeRouter);
projectDetailRouter.use('/accountActions', accountActionsRouter);
projectDetailRouter.use('/accountingReports', accountingReportsRouter);
projectDetailRouter.use('/accounts', accountsRouter);
projectDetailRouter.use('/accountStatusTypes', accountStatusTypesRouter);
projectDetailRouter.use('/accountTitles', accountTitlesRouter);
projectDetailRouter.use('/actions', actionsRouter);
projectDetailRouter.use('/applications', applicationsRouter);
projectDetailRouter.use('/assetTransactions', assetTransactionsRouter);
projectDetailRouter.use('/authorizations', authorizationsRouter);
projectDetailRouter.use('/categoryCodes', categoryCodesRouter);
projectDetailRouter.use('/categoryCodeSets', categoryCodeSetsRouter);
projectDetailRouter.use('/creativeWorks', creativeWorksRouter);
projectDetailRouter.use('/customers', customersRouter);
projectDetailRouter.use('/emailMessageAboutIdentifiers', emailMessageAboutIdentifiersRouter);
projectDetailRouter.use('/emailMessages', emailMessagesRouter);
projectDetailRouter.use('/events/screeningEvent', screeningEventRouter);
projectDetailRouter.use('/events/screeningEventSeries', screeningEventSeriesRouter);
projectDetailRouter.use('/iam/members', iamMembersRouter);
projectDetailRouter.use('/iam/roles', iamRolesRouter);
projectDetailRouter.use('/offerCatalogs', offerCatalogsRouter);
projectDetailRouter.use('/offers', offersRouter);
projectDetailRouter.use('/orders', ordersRouter);
projectDetailRouter.use('/ownershipInfos', ownershipInfosRouter);
projectDetailRouter.use('/paymentMethods/movieTicket', movieTicketPaymentMethodRouter);
projectDetailRouter.use('/paymentServices', paymentServicesRouter);
projectDetailRouter.use('/people', peopleRouter);
projectDetailRouter.use('/places/movieTheater', movieTheaterRouter);
projectDetailRouter.use('/places/screeningRoom', screeningRoomRouter);
projectDetailRouter.use('/places/screeningRoomSection', screeningRoomSectionRouter);
projectDetailRouter.use('/places/seat', seatRouter);
projectDetailRouter.use('/priceSpecifications', priceSpecificationsRouter);
projectDetailRouter.use('/products', productsRouter);
projectDetailRouter.use('/reservations', reservationsRouter);
projectDetailRouter.use('/sellers', sellersRouter);
projectDetailRouter.use('/serviceOutputs', permitsRouter);
projectDetailRouter.use('/settings', settingsRouter);
projectDetailRouter.use('/tasks', tasksRouter);
projectDetailRouter.use('/ticketTypes', ticketTypeMasterRouter);
projectDetailRouter.use('/transactions', transactionsRouter);
projectDetailRouter.use('/waiter', waiterRouter);

export default projectDetailRouter;
