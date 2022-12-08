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
exports.accountTitlesRouter = void 0;
/**
 * 勘定科目管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const Message = require("../message");
const debug = createDebug('chevre-backend:routes');
const NAME_MAX_LENGTH_NAME_JA = 64;
const NUM_ADDITIONAL_PROPERTY = 5;
const accountTitleCategory_1 = require("./accountTitles/accountTitleCategory");
const accountTitleSet_1 = require("./accountTitles/accountTitleSet");
const accountTitlesRouter = (0, express_1.Router)();
exports.accountTitlesRouter = accountTitlesRouter;
accountTitlesRouter.use('/accountTitleCategory', accountTitleCategory_1.accountTitleCategoryRouter);
accountTitlesRouter.use('/accountTitleSet', accountTitleSet_1.accountTitleSetRouter);
accountTitlesRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('accountTitles/index', {});
}));
accountTitlesRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const accountTitleService = new sdk_1.chevre.service.AccountTitle({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        debug('searching...', req.query);
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield accountTitleService.search({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            codeValue: (typeof req.query.codeValue === 'string' && req.query.codeValue.length > 0)
                ? req.query.codeValue
                : undefined,
            inCodeSet: {
                codeValue: (typeof ((_a = req.query.inCodeSet) === null || _a === void 0 ? void 0 : _a.codeValue) === 'string' && req.query.inCodeSet.codeValue.length > 0)
                    ? { $eq: req.query.inCodeSet.codeValue }
                    : undefined,
                inCodeSet: {
                    codeValue: (typeof ((_c = (_b = req.query.inCodeSet) === null || _b === void 0 ? void 0 : _b.inCodeSet) === null || _c === void 0 ? void 0 : _c.codeValue) === 'string'
                        && req.query.inCodeSet.inCodeSet.codeValue.length > 0)
                        ? { $eq: req.query.inCodeSet.inCodeSet.codeValue }
                        : undefined
                }
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
            message: error.message,
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
accountTitlesRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const accountTitleService = new sdk_1.chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                const accountTitle = yield createFromBody(req);
                yield accountTitleService.create(accountTitle);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/accountTitles/${accountTitle.codeValue}`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [] }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (req.method === 'POST') {
        // レイティングを保管
        if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
            forms.inCodeSet = JSON.parse(req.body.inCodeSet);
        }
        else {
            forms.inCodeSet = undefined;
        }
    }
    res.render('accountTitles/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
// tslint:disable-next-line:use-default-type-parameter
accountTitlesRouter.all('/:codeValue', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e, _f;
    try {
        let message = '';
        let errors = {};
        const accountTitleService = new sdk_1.chevre.service.AccountTitle({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchAccountTitlesResult = yield accountTitleService.search({
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: req.params.codeValue }
        });
        let accountTitle = searchAccountTitlesResult.data.shift();
        if (accountTitle === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('AccounTitle');
        }
        if (req.method === 'POST') {
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            console.error('errors', errors);
            if (validatorResult.isEmpty()) {
                // コンテンツDB登録
                try {
                    accountTitle = yield createFromBody(req);
                    debug('saving account title...', accountTitle);
                    yield accountTitleService.update(accountTitle);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        else if (req.method === 'DELETE') {
            try {
                yield preDelete(req, accountTitle);
                yield accountTitleService.deleteByCodeValue({
                    // project: { id: req.project.id },
                    codeValue: accountTitle.codeValue,
                    inCodeSet: {
                        codeValue: String((_d = accountTitle.inCodeSet) === null || _d === void 0 ? void 0 : _d.codeValue),
                        inCodeSet: {
                            codeValue: String((_f = (_e = accountTitle.inCodeSet) === null || _e === void 0 ? void 0 : _e.inCodeSet) === null || _f === void 0 ? void 0 : _f.codeValue)
                        }
                    }
                });
                res.status(http_status_1.NO_CONTENT)
                    .end();
            }
            catch (error) {
                res.status(http_status_1.BAD_REQUEST)
                    .json({ error: { message: error.message } });
            }
            return;
        }
        const forms = Object.assign(Object.assign({ additionalProperty: [] }, accountTitle), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // レイティングを保管
            if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
                forms.inCodeSet = JSON.parse(req.body.inCodeSet);
            }
            else {
                forms.inCodeSet = undefined;
            }
        }
        res.render('accountTitles/edit', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (error) {
        next(error);
    }
}));
function preDelete(req, accountTitle) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // 関連するオファー
        const searchOffersResult = yield offerService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            priceSpecification: {
                accounting: {
                    operatingRevenue: {
                        codeValue: { $eq: accountTitle.codeValue }
                    }
                }
            }
        });
        if (searchOffersResult.data.length > 0) {
            throw new Error('関連するオファーが存在します');
        }
    });
}
function createFromBody(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const accountTitleService = new sdk_1.chevre.service.AccountTitle({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // 科目検索
        let accountTitleSet;
        if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
            const selectedAccountTitleSet = JSON.parse(req.body.inCodeSet);
            const searchAccountTitleSetsResult = yield accountTitleService.searchAccountTitleSets({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                codeValue: { $eq: selectedAccountTitleSet.codeValue }
            });
            accountTitleSet = searchAccountTitleSetsResult.data.shift();
        }
        if (accountTitleSet === undefined) {
            throw new Error('科目が見つかりません');
        }
        return {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: 'AccountTitle',
            codeValue: req.body.codeValue,
            name: req.body.name,
            inCodeSet: accountTitleSet,
            additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined
        };
    });
}
/**
 * 細目バリデーション
 */
function validate() {
    return [
        (0, express_validator_1.body)('inCodeSet')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '科目')),
        (0, express_validator_1.body)('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .isLength({ min: 2, max: 12 })
            .withMessage('2~12文字で入力してください')
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage(() => '英数字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        (0, express_validator_1.body)('name')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA)),
        (0, express_validator_1.body)([
            'additionalProperty.*.name'
        ])
            .optional()
            .isString()
            .matches(/^[a-zA-Z]*$/)
            .withMessage('半角アルファベットで入力してください')
            .if((value) => String(value).length > 0)
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
    ];
}
