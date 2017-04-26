import { Models } from '@motionpicture/chevre-domain';
import * as mongoose from 'mongoose';
import * as Message from '../../../common/Const/Message';
import TicketTypeModel from '../../models/Master/TicketTypeModel';
import MasterBaseController from './MasterBaseController';

// 基数
const DEFAULT_RADIX: number = 10;
// 1ページに表示するデータ数
const DEFAULT_LINES: number = 10;
// 券種コード 半角64
const NAME_MAX_LENGTH_CODE: number = 64;
// 券種名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA: number = 64;
// 券種名・英語 半角128
const NAME_MAX_LENGTH_NAME_EN: number = 64;

/**
 * 券種マスタコントローラー
 *
 * @export
 * @class ticketTypeController
 * @extends {MasterBaseController}
 */
export default class TicketTypeController extends MasterBaseController {
    public layout: string = 'layouts/master/layout';
    /**
     * 新規登録
     */
    public add(): void {
        if (!this.req.staffUser) return this.next(new Error(Message.Common.unexpectedError));
        let ticketTypeModel: TicketTypeModel = new TicketTypeModel();
        if (this.req.method === 'POST') {
            // モデルに画面入力値をセット
            ticketTypeModel = this.parseModel<TicketTypeModel>(ticketTypeModel);
            // 検証
            const errors = this.validateFormAdd();
            const isValid: boolean = !errors;
            // 検証
            if (isValid) {
                // 券種DB登録プロセス
                this.processAddTicketType(ticketTypeModel, (addErr: Error | null, ticketType: mongoose.Document | null) => {
                    if (ticketType) {
                        //ticketTypeModel.ticketNameJa = '';
                    }
                    if (addErr) {
                        // エラー画面遷移
                        this.next(addErr);
                    } else {
                        // 券種マスタ画面遷移
                        ticketTypeModel.message = Message.Common.add;
                        this.renderDisplayAdd(ticketTypeModel, errors);
                    }
                });
            } else {
                // 券種マスタ画面遷移
                this.renderDisplayAdd(ticketTypeModel, errors);
            }
        } else {
            // 券種マスタ画面遷移
            this.renderDisplayAdd(ticketTypeModel, null);
        }
    }
    /**
     * 一覧データ取得API
     */
    public getList(): void {
        if (!this.req.staffUser) return this.next(new Error(Message.Common.unexpectedError));
        // 表示件数・表示ページ
        const limit: number = (this.req.query.limit) ? parseInt(this.req.query.limit, DEFAULT_RADIX) : DEFAULT_LINES;
        const page: number = (this.req.query.page) ? parseInt(this.req.query.page, DEFAULT_RADIX) : 1;
        // 券種コード
        const ticketCode: string = (this.req.query.ticketCode) ? this.req.query.ticketCode : null;
        // 管理用券種名
        const managementTypeName: string = (this.req.query.managementTypeName) ? this.req.query.managementTypeName : null;
        // 金額
        const ticketCharge: string = (this.req.query.ticketCharge) ? this.req.query.ticketCharge : null;

        // 検索条件を作成
        const conditions: any = {};
        // 券種コード
        if ( ticketCode) {
            const key: string = '_id';
            conditions[key] = ticketCode;
        }
        // 管理用券種名
        if (managementTypeName) {
            conditions['name.ja'] = MasterBaseController.getRegxForwardMatching(managementTypeName);
        }
        // 金額
        if (ticketCharge) {
            const key: string = 'charge';
            conditions[key] = ticketCharge;
        }
        const result = {
            success: false,
            results: [],
            count: 0
        };
        Models.Film.count(
            conditions,
            (err, count) => {
                if (err) {
                    this.res.json(result);
                } else {
                    if (count === 0) {
                        result.success = true;
                        this.res.json(result);
                    } else {
                        this.findData(conditions, limit, page, count);
                    }
                }
            }
        );
    }
    /**
     * 一覧データ取得
     *
     * @param {any} conditions
     * @param {number} limit
     * @param {number} page
     * @param {number} count
     */
    public findData(conditions: any, limit: number, page: number, count: number): void {
        const result = {
            success: false,
            results: [],
            count: 0
        };
        // @@@@@@@@@@@@@@ ticketTypeに変更 @@@@@@@@@@@@@
        Models.Film.find( conditions )
            .skip(limit * (page - 1))
            .limit(limit)
            .lean(true)
            .exec((findErr, tickets: any[]) => {
                if (findErr) {
                    this.res.json(result);
                } else {
                    //検索結果編集
                    const results = tickets.map((ticket: any) => {
                        return {
                            _id: ticket._id,
                            ticketCode: ticket._id,
                            ticketNameJa: ticket.name.ja,
                            managementTypeName: '管理用券種名',
                            ticketCharge: ticket.minutes
                        };
                    });
                    this.res.json({
                        success: true,
                        count: count,
                        results: results
                    });
                }
            }
        );
    }
    /**
     * 一覧
     */
    public list(): void {
        if (!this.req.staffUser) return this.next(new Error(Message.Common.unexpectedError));
        const ticketTypeModel: TicketTypeModel = new TicketTypeModel();
        if (this.req.method !== 'POST') {
            // 券種マスタ画面遷移
            this.renderDisplayList(ticketTypeModel);
        }
    }

    /**
     * 券種DB登録プロセス
     *
     * @param {TicketTypeModel} ticketTypeModel
     */
    private processAddTicketType(ticketTypeModel: TicketTypeModel, cb: (err: Error | null, ticket: mongoose.Document) => void): void {
        const digits: number = 6;
        MasterBaseController.getId('ticketTypeId', digits, (err, id) => {
            if (err || !id) return this.next(new Error(Message.Common.unexpectedError));
            // 券種DB登録
            Models.Film.create(
                {
                    _id: id,
                    name: {
                        ja: ticketTypeModel.ticketNameJa,
                        en: ticketTypeModel.managementTypeName
                    },
                    is_mx4d: true
                },
                (errDb: any, ticketType: any) => {
                    if (errDb) {
                        cb(errDb, ticketType);
                    } else {
                        cb(null, ticketType);
                    }
                }
            );
        });
    }
    /**
     * 券種マスタ新規登録画面遷移
     *
     * @param {TicketTypeModel} ticketTypeModel
     */
    private renderDisplayAdd (ticketTypeModel: TicketTypeModel, errors: any): void {
        this.res.locals.displayId = 'Aa-5';
        this.res.locals.title = '券種マスタ新規登録';
        this.res.render('master/ticketType/add', {
            ticketTypeModel: ticketTypeModel,
            errors: errors,
            layout: 'layouts/master/layout'
        });
    }
    /**
     * 券種マスタ一覧画面遷移
     *
     * @param {TicketTypeModel} ticketTypeModel
     */
    private renderDisplayList (ticketTypeModel: TicketTypeModel): void {
        this.res.locals.displayId = 'Aa-6';
        this.res.locals.title = '券種マスタ一覧';
        this.res.render('master/ticketType/list', {
            ticketTypeModel: ticketTypeModel,
            layout: 'layouts/master/layout'
        });
    }
    /**
     * 券種マスタ新規登録画面検証
     *
     * @param {TicketTypeModel} ticketTypeModel
     */
    private validateFormAdd(): ExpressValidator.Dictionary<ExpressValidator.MappedError> | ExpressValidator.MappedError[] {
        // 券種コード
        let colName: string = '券種コード';
        this.req.assert('ticketTypeCode', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
        this.req.assert('ticketTypeCode', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_CODE)).len({max: NAME_MAX_LENGTH_CODE});
        // 券種名
        colName = '券種名';
        this.req.assert('ticketNameJa', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
        this.req.assert('ticketNameJa', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_CODE)).len({max: NAME_MAX_LENGTH_NAME_JA});
        // 券種名英
        colName = '券種名英';
        this.req.assert('ticketNameEn', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
        this.req.assert('ticketNameEn', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_EN)).len({max: NAME_MAX_LENGTH_NAME_EN});
        // 検証実行
        return this.req.validationErrors(true);
    }
}
