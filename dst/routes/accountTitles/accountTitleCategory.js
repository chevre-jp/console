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
 * 科目分類管理ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../../factory/reservedCodeValues");
const Message = require("../../message");
const debug = createDebug('chevre-backend:routes');
const NUM_ADDITIONAL_PROPERTY = 5;
const NAME_MAX_LENGTH_NAME_JA = 64;
const accountTitleCategoryRouter = express_1.Router();
accountTitleCategoryRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const accountTitleService = new sdk_1.chevre.service.AccountTitle({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.xhr) {
        try {
            debug('searching accountTitleCategories...', req.query);
            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = yield accountTitleService.searchAccountTitleCategories({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                codeValue: (req.query.codeValue !== undefined && req.query.codeValue !== '') ? `${req.query.codeValue}` : undefined,
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
        res.render('accountTitles/accountTitleCategory/index', {
            forms: {}
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
accountTitleCategoryRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                const accountTitleCategory = createFromBody(req, true);
                debug('saving account title...', accountTitleCategory);
                const accountTitleService = new sdk_1.chevre.service.AccountTitle({
                    endpoint: process.env.API_ENDPOINT,
                    auth: req.user.authClient,
                    project: { id: req.project.id }
                });
                yield accountTitleService.createAccounTitleCategory(accountTitleCategory);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/accountTitles/accountTitleCategory/${accountTitleCategory.codeValue}`);
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
    res.render('accountTitles/accountTitleCategory/add', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
// tslint:disable-next-line:use-default-type-parameter
accountTitleCategoryRouter.all('/:codeValue', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let message = '';
        let errors = {};
        const accountTitleService = new sdk_1.chevre.service.AccountTitle({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchAccountTitlesResult = yield accountTitleService.searchAccountTitleCategories({
            project: { id: { $eq: req.project.id } },
            codeValue: { $eq: req.params.codeValue }
        });
        let accountTitleCategory = searchAccountTitlesResult.data.shift();
        if (accountTitleCategory === undefined) {
            throw new sdk_1.chevre.factory.errors.NotFound('AccounTitle');
        }
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                // コンテンツDB登録
                try {
                    accountTitleCategory = createFromBody(req, false);
                    debug('saving account title...', accountTitleCategory);
                    yield accountTitleService.updateAccounTitleCategory(accountTitleCategory);
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
                yield preDelete(req, accountTitleCategory);
                yield accountTitleService.deleteAccounTitleCategory({
                    // project: { id: req.project.id },
                    codeValue: accountTitleCategory.codeValue
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
        const forms = Object.assign(Object.assign({ additionalProperty: [] }, accountTitleCategory), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        res.render('accountTitles/accountTitleCategory/edit', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (error) {
        next(error);
    }
}));
function preDelete(req, accountTitleCategory) {
    return __awaiter(this, void 0, void 0, function* () {
        // validation
        const accountTitleService = new sdk_1.chevre.service.AccountTitle({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const offerService = new sdk_1.chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // 科目に属する全細目
        const limit = 100;
        let page = 0;
        let numData = limit;
        const accountTitles = [];
        while (numData === limit) {
            page += 1;
            const searchAccountTitlesResult = yield accountTitleService.search({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                inCodeSet: {
                    inCodeSet: {
                        codeValue: { $eq: accountTitleCategory.codeValue }
                    }
                }
            });
            numData = searchAccountTitlesResult.data.length;
            accountTitles.push(...searchAccountTitlesResult.data);
        }
        const searchOffersPer = 10;
        if (accountTitles.length > 0) {
            // 関連するオファーを10件ずつ確認する(queryの長さは有限なので)
            // tslint:disable-next-line:no-magic-numbers
            const searchCount = Math.ceil(accountTitles.length / searchOffersPer);
            // tslint:disable-next-line:prefer-array-literal
            const searchNubmers = [...Array(searchCount)].map((__, i) => i);
            for (const i of searchNubmers) {
                const start = i * searchOffersPer;
                const end = Math.min(start + searchOffersPer - 1, accountTitles.length);
                const searchOffersResult = yield offerService.search({
                    limit: 1,
                    project: { id: { $eq: req.project.id } },
                    priceSpecification: {
                        accounting: {
                            operatingRevenue: {
                                codeValue: {
                                    $in: accountTitles.slice(start, end)
                                        .map((a) => a.codeValue)
                                }
                            }
                        }
                    }
                });
                if (searchOffersResult.data.length > 0) {
                    throw new Error('関連するオファーが存在します');
                }
            }
        }
    });
}
function createFromBody(req, isNew) {
    return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: 'AccountTitle', codeValue: req.body.codeValue, name: req.body.name, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined }, (isNew)
        ? { hasCategoryCode: [] }
        : undefined);
}
/**
 * 科目分類検証
 */
function validate() {
    return [
        express_validator_1.body('codeValue')
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
        express_validator_1.body('name')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME_JA))
    ];
}
exports.default = accountTitleCategoryRouter;
