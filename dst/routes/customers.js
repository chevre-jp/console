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
exports.customersRouter = void 0;
/**
 * 顧客ルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const google_libphonenumber_1 = require("google-libphonenumber");
const http_status_1 = require("http-status");
const reservedCodeValues_1 = require("../factory/reservedCodeValues");
const Message = require("../message");
const NUM_CONTACT_POINT = 5;
const NUM_ADDITIONAL_PROPERTY = 10;
const customersRouter = (0, express_1.Router)();
exports.customersRouter = customersRouter;
customersRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('customers/index', {
        message: ''
    });
}));
// tslint:disable-next-line:use-default-type-parameter
customersRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const customerService = new sdk_1.chevre.service.Customer({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // 検証
        const validatorResult = (0, express_validator_1.validationResult)(req);
        errors = validatorResult.mapped();
        // 検証
        if (validatorResult.isEmpty()) {
            // 登録プロセス
            try {
                req.body.id = '';
                let customer = yield createFromBody(req, true);
                customer = yield customerService.create(customer);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/customers/${customer.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        else {
            message = '入力項目をご確認ください';
        }
    }
    const forms = Object.assign({ additionalProperty: [], contactPoint: [], name: {} }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    if (forms.contactPoint.length < NUM_CONTACT_POINT) {
        // tslint:disable-next-line:prefer-array-literal
        forms.contactPoint.push(...[...Array(NUM_CONTACT_POINT - forms.contactPoint.length)].map(() => {
            return {};
        }));
    }
    res.render('customers/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
customersRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const customerService = new sdk_1.chevre.service.Customer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const searchConditions = {
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            branchCode: (typeof ((_a = req.query.branchCode) === null || _a === void 0 ? void 0 : _a.$regex) === 'string' && req.query.branchCode.$regex.length > 0)
                ? { $regex: req.query.branchCode.$regex }
                : undefined,
            name: (typeof req.query.name === 'string' && req.query.name.length > 0) ? { $regex: req.query.name } : undefined
        };
        let data;
        const searchResult = yield customerService.search(searchConditions);
        data = searchResult.data;
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((t) => {
                return Object.assign(Object.assign({}, t), { numContactPoint: (Array.isArray(t.contactPoint)) ? t.contactPoint.length : 0 });
            })
        });
    }
    catch (err) {
        res.json({
            success: false,
            message: err.message,
            count: 0,
            results: []
        });
    }
}));
customersRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customerService = new sdk_1.chevre.service.Customer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const customer = yield customerService.findById({ id: String(req.params.id) });
        res.json(customer);
    }
    catch (err) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: err.message
        });
    }
}));
customersRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customerService = new sdk_1.chevre.service.Customer({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const customer = yield customerService.findById({ id: req.params.id });
        yield preDelete(req, customer);
        yield customerService.deleteById({ id: req.params.id });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function preDelete(__, ___) {
    return __awaiter(this, void 0, void 0, function* () {
        // 施設が存在するかどうか
        // const placeService = new chevre.service.Place({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient
        // });
        // const searchMovieTheatersResult = await placeService.searchMovieTheaters({
        //     limit: 1,
        //     project: { ids: [req.project.id] },
        //     parentOrganization: { id: { $eq: seller.id } }
        // });
        // if (searchMovieTheatersResult.data.length > 0) {
        //     throw new Error('関連する施設が存在します');
        // }
    });
}
// tslint:disable-next-line:use-default-type-parameter
customersRouter.all('/:id/update', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const customerService = new sdk_1.chevre.service.Customer({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        let customer = yield customerService.findById({ id: req.params.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = (0, express_validator_1.validationResult)(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    customer = yield createFromBody(req, false);
                    yield customerService.update({ id: String(customer.id), attributes: customer });
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
            else {
                message = '入力項目をご確認ください';
            }
        }
        const forms = Object.assign(Object.assign({}, customer), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        if (forms.contactPoint.length < NUM_CONTACT_POINT) {
            // tslint:disable-next-line:prefer-array-literal
            forms.contactPoint.push(...[...Array(NUM_CONTACT_POINT - forms.contactPoint.length)].map(() => {
                return {};
            }));
        }
        if (req.method === 'POST') {
            // no op
        }
        else {
            // no op
        }
        res.render('customers/update', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:cyclomatic-complexity
function createFromBody(req, isNew) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let nameFromJson = {};
        if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
            try {
                nameFromJson = JSON.parse(req.body.nameStr);
            }
            catch (error) {
                throw new Error(`高度な名称の型が不適切です ${error.message}`);
            }
        }
        const telephone = req.body.telephone;
        const url = req.body.url;
        return Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: sdk_1.chevre.factory.organizationType.Organization, id: req.body.id, branchCode: req.body.branchCode, name: Object.assign(Object.assign(Object.assign({}, nameFromJson), { ja: req.body.name.ja }), (typeof ((_a = req.body.name) === null || _a === void 0 ? void 0 : _a.en) === 'string') ? { en: req.body.name.en } : undefined), additionalProperty: (Array.isArray(req.body.additionalProperty))
                ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : undefined, contactPoint: (Array.isArray(req.body.contactPoint))
                ? req.body.contactPoint.filter((p) => (typeof p.name === 'string' && p.name.length > 0)
                    || (typeof p.email === 'string' && p.email.length > 0)
                    || (typeof p.telephone === 'string' && p.telephone.length > 0))
                    .map((p) => {
                    return Object.assign(Object.assign(Object.assign({ typeOf: 'ContactPoint' }, (typeof p.name === 'string' && p.name.length > 0) ? { name: p.name } : undefined), (typeof p.email === 'string' && p.email.length > 0) ? { email: p.email } : undefined), (typeof p.telephone === 'string' && p.telephone.length > 0) ? { telephone: p.telephone } : undefined);
                })
                : [] }, (typeof telephone === 'string' && telephone.length > 0) ? { telephone } : undefined), (typeof url === 'string' && url.length > 0) ? { url } : undefined), (!isNew)
            ? {
                $unset: Object.assign(Object.assign({}, (typeof telephone !== 'string' || telephone.length === 0) ? { telephone: 1 } : undefined), (typeof url !== 'string' || url.length === 0) ? { url: 1 } : undefined)
            }
            : undefined);
    });
}
// tslint:disable-next-line:max-func-body-length
function validate() {
    return [
        (0, express_validator_1.body)('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ min: 3, max: 12 })
            .withMessage('3~12文字で入力してください')
            // 予約語除外
            .not()
            .isIn(reservedCodeValues_1.RESERVED_CODE_VALUES)
            .withMessage('予約語のため使用できません'),
        (0, express_validator_1.body)(['name.ja'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 64)),
        (0, express_validator_1.body)('contactPoint.*.email')
            .optional()
            .if((value) => String(value).length > 0)
            .isEmail()
            .withMessage('メールアドレスの形式が不適切です')
            .isLength({ max: 128 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('メールアドレス', 128)),
        (0, express_validator_1.body)('contactPoint.*.telephone')
            .optional()
            .if((value) => String(value).length > 0)
            .custom((value) => {
            // 電話番号バリデーション
            try {
                const phoneUtil = google_libphonenumber_1.PhoneNumberUtil.getInstance();
                // const phoneNumber = phoneUtil.parse(telephone, params.agent.telephoneRegion);
                const phoneNumber = phoneUtil.parse(value);
                if (!phoneUtil.isValidNumber(phoneNumber)) {
                    throw new Error('Invalid phone number');
                }
            }
            catch (error) {
                throw new Error('E.164形式で入力してください');
            }
            return true;
        })
            .customSanitizer((value) => {
            // 電話番号バリデーション
            let formattedTelephone = value;
            try {
                const phoneUtil = google_libphonenumber_1.PhoneNumberUtil.getInstance();
                // const phoneNumber = phoneUtil.parse(telephone, params.agent.telephoneRegion);
                const phoneNumber = phoneUtil.parse(value);
                // if (!phoneUtil.isValidNumber(phoneNumber)) {
                //     throw new Error('Invalid phone number');
                // }
                formattedTelephone = phoneUtil.format(phoneNumber, google_libphonenumber_1.PhoneNumberFormat.E164);
                // value = formattedTelephone;
            }
            catch (error) {
                // no op
            }
            return formattedTelephone;
        })
            .isLength({ max: 128 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('電話番号', 128)),
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
        // body('contactPoint')
        //     .optional()
        //     .isArray()
        //     .custom((value) => {
        //         // 電話番号バリデーション
        //         // const telephones = (<any[]>value)
        //         //     .filter((p) => String(p.telephone).length > 0)
        //         //     .map((p) => String(p.telephone));
        //         (<any[]>value).forEach((p) => {
        //             const telephone = String(p.telephone);
        //             if (telephone.length > 0) {
        //                 let formattedTelephone: string;
        //                 try {
        //                     const phoneUtil = PhoneNumberUtil.getInstance();
        //                     // const phoneNumber = phoneUtil.parse(telephone, params.agent.telephoneRegion);
        //                     const phoneNumber = phoneUtil.parse(telephone);
        //                     if (!phoneUtil.isValidNumber(phoneNumber)) {
        //                         throw new Error('Invalid phone number');
        //                     }
        //                     formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
        //                     p.telephone = formattedTelephone;
        //                 } catch (error) {
        //                     throw new Error('電話番号のフォーマットを確認してください');
        //                 }
        //             }
        //         });
        //         return true;
        //     })
    ];
}
