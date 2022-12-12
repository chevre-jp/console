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
exports.additionalPropertiesRouter = void 0;
/**
 * 追加特性ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const Tokens = require("csrf");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const additionalPropertyNameCategoryCodeSet_1 = require("../factory/additionalPropertyNameCategoryCodeSet");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const validateCsrfToken_1 = require("../middlewares/validateCsrfToken");
const additionalPropertiesRouter = (0, express_1.Router)();
exports.additionalPropertiesRouter = additionalPropertiesRouter;
additionalPropertiesRouter.get('', (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('additionalProperties/index', {
        message: '',
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier,
        categoryCodeSets: additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet
    });
}));
additionalPropertiesRouter.get('/categoryCodeSets', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.query.format === 'datatable') {
        res.json({
            success: true,
            count: additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet.length,
            results: additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet
        });
    }
    else {
        res.json(additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet);
    }
}));
additionalPropertiesRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const additionalPropertyService = new sdk_1.chevre.service.AdditionalProperty({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield additionalPropertyService.search({
            limit: limit,
            page: page,
            sort: { codeValue: sdk_1.chevre.factory.sortType.Ascending },
            project: { id: { $eq: req.project.id } },
            inCodeSet: {
                identifier: {
                    $eq: (typeof ((_a = req.query.inCodeSet) === null || _a === void 0 ? void 0 : _a.identifier) === 'string' && req.query.inCodeSet.identifier.length > 0)
                        ? req.query.inCodeSet.identifier
                        : undefined,
                    $in: (Array.isArray((_c = (_b = req.query.inCodeSet) === null || _b === void 0 ? void 0 : _b.identifier) === null || _c === void 0 ? void 0 : _c.$in))
                        ? (_d = req.query.inCodeSet) === null || _d === void 0 ? void 0 : _d.identifier.$in
                        : undefined
                }
            },
            codeValue: {
                $eq: (typeof ((_e = req.query.codeValue) === null || _e === void 0 ? void 0 : _e.$eq) === 'string' && req.query.codeValue.$eq.length > 0)
                    ? req.query.codeValue.$eq
                    : undefined
            },
            name: {
                $regex: (typeof ((_f = req.query.name) === null || _f === void 0 ? void 0 : _f.$regex) === 'string' && req.query.name.$regex.length > 0)
                    ? req.query.name.$regex
                    : undefined
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((d) => {
                const categoryCodeSet = additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet.find((c) => c.identifier === d.inCodeSet.identifier);
                return Object.assign(Object.assign({}, d), { categoryCodeSetName: categoryCodeSet === null || categoryCodeSet === void 0 ? void 0 : categoryCodeSet.name });
            })
        });
    }
    catch (error) {
        res.json({
            success: false,
            message: error.message,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
additionalPropertiesRouter.all('/new', validateCsrfToken_1.validateCsrfToken, ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    let csrfToken;
    const additionalPropertyService = new sdk_1.chevre.service.AdditionalProperty({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                let additionalProperty = createAdditionalPropertyFromBody(req, true);
                // コード重複確認
                switch (additionalProperty.inCodeSet.identifier) {
                    // その他はグローバルユニークを考慮
                    default:
                        const searchDuplicatedAdditionalPropertiesResult = yield additionalPropertyService.search({
                            limit: 1,
                            codeValue: { $eq: additionalProperty.codeValue },
                            inCodeSet: { identifier: { $eq: additionalProperty.inCodeSet.identifier } }
                        });
                        if (searchDuplicatedAdditionalPropertiesResult.data.length > 0) {
                            throw new Error('既に存在するコードです');
                        }
                }
                additionalProperty = yield additionalPropertyService.create(additionalProperty);
                // tslint:disable-next-line:no-dynamic-delete
                delete req.session.csrfSecret;
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/additionalProperties/${additionalProperty.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    else {
        const tokens = new Tokens();
        const csrfSecret = yield tokens.secret();
        csrfToken = tokens.create(csrfSecret);
        req.session.csrfSecret = {
            value: csrfSecret,
            createDate: new Date()
        };
    }
    const forms = Object.assign(Object.assign({}, (typeof csrfToken === 'string') ? { csrfToken } : undefined), req.body);
    if (req.method === 'POST') {
        // レイティングを保管
        if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
            forms.inCodeSet = JSON.parse(req.body.inCodeSet);
        }
        else {
            forms.inCodeSet = undefined;
        }
    }
    res.render('additionalProperties/new', {
        message: message,
        errors: errors,
        forms: forms,
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier,
        categoryCodeSets: additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet
    });
}));
additionalPropertiesRouter.get('/:id/image', (__, res) => {
    res.status(http_status_1.NO_CONTENT)
        .end();
});
// tslint:disable-next-line:use-default-type-parameter
additionalPropertiesRouter.all('/:id/update', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const additionalPropertyService = new sdk_1.chevre.service.AdditionalProperty({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    let additionalProperty = yield additionalPropertyService.findById({
        id: req.params.id
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            // コンテンツDB登録
            try {
                additionalProperty = Object.assign(Object.assign({}, createAdditionalPropertyFromBody(req, false)), { id: String(additionalProperty.id) });
                yield additionalPropertyService.update(additionalProperty);
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign(Object.assign(Object.assign({}, additionalProperty), {
        inCodeSet: additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet.find((s) => s.identifier === additionalProperty.inCodeSet.identifier)
    }), req.body);
    if (req.method === 'POST') {
        if (typeof req.body.inCodeSet === 'string' && req.body.inCodeSet.length > 0) {
            forms.inCodeSet = JSON.parse(req.body.inCodeSet);
        }
        else {
            forms.inCodeSet = undefined;
        }
    }
    res.render('additionalProperties/update', {
        message: message,
        errors: errors,
        forms: forms,
        CategorySetIdentifier: sdk_1.chevre.factory.categoryCode.CategorySetIdentifier,
        categoryCodeSets: additionalPropertyNameCategoryCodeSet_1.additionalPropertyNameCategoryCodeSet
    });
}));
additionalPropertiesRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const additionalPropertyService = new sdk_1.chevre.service.AdditionalProperty({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const additionalProperty = yield additionalPropertyService.findById({ id: req.params.id });
        yield preDelete(req, additionalProperty);
        yield additionalPropertyService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(req, additionalProperty) {
    return __awaiter(this, void 0, void 0, function* () {
        const eventService = new sdk_1.chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        switch (additionalProperty.inCodeSet.identifier) {
            case sdk_1.chevre.factory.eventType.ScreeningEventSeries:
                const searchEventSeriesResult = yield eventService.search({
                    limit: 1,
                    page: 1,
                    typeOf: sdk_1.chevre.factory.eventType.ScreeningEventSeries,
                    additionalProperty: {
                        $elemMatch: { name: { $eq: additionalProperty.codeValue } }
                    }
                });
                if (searchEventSeriesResult.data.length > 0) {
                    throw new Error('関連する施設コンテンツが存在します');
                }
            case sdk_1.chevre.factory.eventType.ScreeningEvent:
                const searchEventsResult = yield eventService.search({
                    limit: 1,
                    page: 1,
                    typeOf: sdk_1.chevre.factory.eventType.ScreeningEvent,
                    additionalProperty: {
                        $elemMatch: { name: { $eq: additionalProperty.codeValue } }
                    }
                });
                if (searchEventsResult.data.length > 0) {
                    throw new Error('関連するスケジュールが存在します');
                }
            default:
            // no op
        }
    });
}
function createAdditionalPropertyFromBody(req, isNew) {
    const inCodeSet = JSON.parse(req.body.inCodeSet);
    return Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: 'CategoryCode', codeValue: req.body.codeValue, inCodeSet: {
            typeOf: 'CategoryCodeSet',
            identifier: inCodeSet.identifier
        }, name: {
            ja: req.body.name.ja
            // ...(typeof nameEn === 'string' && nameEn.length > 0) ? { en: nameEn } : undefined
        } }, (!isNew)
        ? {
            $unset: {}
        }
        : undefined);
}
function validate() {
    return [
        (0, express_validator_1.body)('inCodeSet')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '親リソース')),
        (0, express_validator_1.body)('codeValue')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            // .isAlphanumeric()
            .matches(/^[a-zA-Z]+$/)
            .withMessage(() => '半角アルファベットで入力してください')
            .isLength({ min: 5, max: 30 })
            .withMessage('5~30文字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        (0, express_validator_1.body)('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30))
    ];
}
