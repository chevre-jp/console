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
 * Eメールメッセージルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../message");
const emailMessagesRouter = express_1.Router();
emailMessagesRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('emailMessages/index', {
        message: ''
    });
}));
// tslint:disable-next-line:use-default-type-parameter
emailMessagesRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const emailMessageService = new sdk_1.chevre.service.EmailMessage({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    if (req.method === 'POST') {
        // 検証
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        // 検証
        if (validatorResult.isEmpty()) {
            // 登録プロセス
            try {
                req.body.id = '';
                let emailMessage = yield createFromBody(req, true);
                const { data } = yield emailMessageService.search({
                    limit: 1,
                    identifier: { $eq: String(emailMessage.identifier) }
                });
                if (data.length > 0) {
                    throw new Error('既に存在するコードです');
                }
                emailMessage = yield emailMessageService.create(emailMessage);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/emailMessages/${emailMessage.id}/update`);
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
    const forms = Object.assign({ about: {}, sender: {} }, req.body);
    res.render('emailMessages/new', {
        message: message,
        errors: errors,
        forms: forms
    });
}));
emailMessagesRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const emailMessageService = new sdk_1.chevre.service.EmailMessage({
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
            identifier: (typeof req.query.identifier === 'string' && req.query.identifier.length > 0)
                ? { $eq: req.query.identifier }
                : undefined
        };
        let data;
        const searchResult = yield emailMessageService.search(searchConditions);
        data = searchResult.data;
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data.map((t) => {
                return Object.assign({}, t
                // numContactPoint: (Array.isArray(t.contactPoint)) ? t.contactPoint.length : 0
                );
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
emailMessagesRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const emailMessageService = new sdk_1.chevre.service.EmailMessage({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const emailMessage = yield emailMessageService.findById({ id: String(req.params.id) });
        res.json(emailMessage);
    }
    catch (err) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: err.message
        });
    }
}));
emailMessagesRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const emailMessageService = new sdk_1.chevre.service.EmailMessage({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const emailMessage = yield emailMessageService.findById({ id: req.params.id });
        yield preDelete(req, emailMessage);
        yield emailMessageService.deleteById({ id: req.params.id });
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
emailMessagesRouter.all('/:id/update', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const emailMessageService = new sdk_1.chevre.service.EmailMessage({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        let emailMessage = yield emailMessageService.findById({ id: req.params.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    req.body.id = req.params.id;
                    emailMessage = yield createFromBody(req, false);
                    yield emailMessageService.update({ id: String(emailMessage.id), attributes: emailMessage });
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
        const forms = Object.assign(Object.assign({}, emailMessage), req.body);
        if (req.method === 'POST') {
            // no op
        }
        else {
            // no op
        }
        res.render('emailMessages/update', {
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
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        return Object.assign(Object.assign({
            project: { typeOf: req.project.typeOf, id: req.project.id }
        }, { typeOf: sdk_1.chevre.factory.creativeWorkType.EmailMessage, identifier: req.body.identifier, about: {
                typeOf: 'Thing',
                identifier: (_a = req.body.about) === null || _a === void 0 ? void 0 : _a.identifier,
                name: (_b = req.body.about) === null || _b === void 0 ? void 0 : _b.name
            }, sender: {
                name: (_c = req.body.sender) === null || _c === void 0 ? void 0 : _c.name,
                email: (_d = req.body.sender) === null || _d === void 0 ? void 0 : _d.email
            }, toRecipient: {}, text: req.body.text }), (!isNew)
            ? {
                id: req.body.id,
                $unset: {
                // ...(typeof telephone !== 'string' || telephone.length === 0) ? { telephone: 1 } : undefined,
                // ...(typeof url !== 'string' || url.length === 0) ? { url: 1 } : undefined
                }
            }
            : undefined);
    });
}
function validate() {
    return [
        express_validator_1.body('identifier')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'コード'))
            .matches(/^[0-9a-zA-Z]+$/)
            .withMessage('半角英数字で入力してください')
            .isLength({ max: 12 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('コード', 12)),
        express_validator_1.body(['about.name'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '件名'))
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('件名', 64)),
        express_validator_1.body(['sender.name'])
            .optional()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('送信者名称', 64)),
        express_validator_1.body(['sender.email'])
            .optional()
            .isLength({ max: 64 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('送信者アドレス', 64))
    ];
}
exports.default = emailMessagesRouter;
