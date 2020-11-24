"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 科目管理ルーター
 */
const chevre = require("@chevre/api-nodejs-client");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const Message = require("../../message");
const debug = createDebug('chevre-backend:routes');
const NAME_MAX_LENGTH_CODE = 30;
const NAME_MAX_LENGTH_NAME_JA = 64;
const accountTitleSetRouter = express_1.Router();
accountTitleSetRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    if (req.xhr) {
        try {
            debug('searching accountTitleCategories...', req.query);
            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = yield accountTitleService.searchAccountTitleSets({
                limit: limit,
                page: page,
                project: { ids: [req.project.id] },
                codeValue: (typeof req.query.codeValue === 'string' && req.query.codeValue.length > 0)
                    ? req.query.codeValue
                    : undefined,
                inCodeSet: {
                    codeValue: (req.query.inCodeSet.codeValue !== undefined && req.query.inCodeSet.codeValue !== '')
                        ? { $eq: req.query.inCodeSet.codeValue }
                        : undefined
                },
                name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? req.query.name : undefined
            });
            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data
            });
        }
        catch (error) {
            res.json({
                success: false,
                count: 0,
                results: []
            });
        }
    }
    else {
        // 科目分類検索
        const searchAccountTitleCategoriesResult = yield accountTitleService.searchAccountTitleCategories({
            limit: 100,
            sort: { codeValue: chevre.factory.sortType.Ascending },
            project: { ids: [req.project.id] }
        });
        res.render('accountTitles/accountTitleSet/index', {
            forms: {},
            accountTitleCategories: searchAccountTitleCategoriesResult.data
        });
    }
}));
accountTitleSetRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                const accountTitleSet = yield createFromBody(req, true);
                debug('saving account title...', accountTitleSet);
                yield accountTitleService.createAccounTitleSet(accountTitleSet);
                req.flash('message', '登録しました');
                res.redirect(`/accountTitles/accountTitleSet/${accountTitleSet.codeValue}`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ inCodeSet: {}, inDefinedTermSet: {} }, req.body);
    // 科目分類検索
    const searchAccountTitleCategoriesResult = yield accountTitleService.searchAccountTitleCategories({
        limit: 100,
        sort: { codeValue: chevre.factory.sortType.Ascending },
        project: { ids: [req.project.id] }
    });
    const accountTitleCategories = searchAccountTitleCategoriesResult.data;
    res.render('accountTitles/accountTitleSet/add', {
        message: message,
        errors: errors,
        forms: forms,
        accountTitleCategories: accountTitleCategories
    });
}));
// tslint:disable-next-line:use-default-type-parameter
accountTitleSetRouter.all('/:codeValue', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const searchAccountTitleSetsResult = yield accountTitleService.searchAccountTitleSets({
        project: { ids: [req.project.id] },
        codeValue: { $eq: req.params.codeValue }
    });
    let accountTitleSet = searchAccountTitleSetsResult.data.shift();
    if (accountTitleSet === undefined) {
        throw new chevre.factory.errors.NotFound('AccounTitle');
    }
    debug('accountTitle found', accountTitleSet);
    // 科目分類検索
    const searchAccountTitleCategoriesResult = yield accountTitleService.searchAccountTitleCategories({
        limit: 100,
        sort: { codeValue: chevre.factory.sortType.Ascending },
        project: { ids: [req.project.id] }
    });
    const accountTitleCategories = searchAccountTitleCategoriesResult.data;
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                accountTitleSet = yield createFromBody(req, false);
                debug('saving account title...', accountTitleSet);
                yield accountTitleService.updateAccounTitleSet(accountTitleSet);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign({ inCodeSet: {}, inDefinedTermSet: {} }, accountTitleSet), req.body);
    res.render('accountTitles/accountTitleSet/edit', {
        message: message,
        errors: errors,
        forms: forms,
        accountTitleCategories: accountTitleCategories
    });
}));
function createFromBody(req, isNew) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        // 科目分類検索
        const searchAccountTitleCategoriesResult = yield accountTitleService.searchAccountTitleCategories({
            limit: 1,
            project: { ids: [req.project.id] },
            codeValue: { $eq: (_a = req.body.inCodeSet) === null || _a === void 0 ? void 0 : _a.codeValue }
        });
        const accountTitleCategory = searchAccountTitleCategoriesResult.data.shift();
        if (accountTitleCategory === undefined) {
            throw new Error('科目分類が見つかりません');
        }
        return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: 'AccountTitle', codeValue: req.body.codeValue, name: req.body.name, hasCategoryCode: [], inCodeSet: accountTitleCategory }, (isNew)
            ? { hasCategoryCode: [] }
            : undefined);
    });
}
/**
 * 科目バリデーション
 */
function validate() {
    return [
        express_validator_1.body('inCodeSet.codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '科目分類')),
        express_validator_1.body('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .isLength({ max: NAME_MAX_LENGTH_CODE })
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', NAME_MAX_LENGTH_CODE))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage(() => '英数字で入力してください'),
        express_validator_1.body('name')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA))
    ];
}
exports.default = accountTitleSetRouter;
