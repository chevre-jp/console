/**
 * 券種マスタ管理ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import { Router } from 'express';
import * as ticketTypeController from '../controllers/ticketType';

const ticketTypeMasterRouter = Router();

// 券種登録
ticketTypeMasterRouter.all('/add', ticketTypeController.add);
// 券種編集
ticketTypeMasterRouter.all('/:id/update', ticketTypeController.update);

// 券種一覧
ticketTypeMasterRouter.get(
    '',
    async (req, res) => {
        const ticketTypeService = new chevre.service.TicketType({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const ticketTypeGroupsList = await ticketTypeService.searchTicketTypeGroups({});

        // 券種マスタ画面遷移
        res.render('ticketType/index', {
            message: '',
            ticketTypeGroupsList: ticketTypeGroupsList.data
        });
    }
);

ticketTypeMasterRouter.get('/getlist', ticketTypeController.getList);
ticketTypeMasterRouter.get('/getTicketTypeGroupList/:ticketTypeId', ticketTypeController.getTicketTypeGroupList);

export default ticketTypeMasterRouter;
