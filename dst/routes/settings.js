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
exports.createFromBody = exports.validate = void 0;
/**
 * プロジェクトルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
// import * as moment from 'moment-timezone';
const Message = require("../message");
const NAME_MAX_LENGTH_NAME = 64;
const settingsRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
settingsRouter.all('', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let message = '';
        let errors = {};
        const projectService = new sdk_1.chevre.service.Project({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: '' }
        });
        let project = yield projectService.findById({ id: req.project.id });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    // req.body.id = req.params.id;
                    project = yield createFromBody(req, false);
                    yield projectService.update(project);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({}, project), req.body);
        if (req.method === 'POST') {
            // no op
        }
        else {
            // no op
        }
        if (project.settings === undefined || project.settings === null) {
            throw new Error('権限がありません');
        }
        res.render('projects/settings', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
    catch (err) {
        next(err);
    }
}));
function validate() {
    return [
        express_validator_1.body('id')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ID'))
            .matches(/^[0-9a-z\-]+$/)
            .isLength({ min: 5, max: 36 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('ID', 36)),
        express_validator_1.body(['name'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME)),
        express_validator_1.body(['alternateName'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'alias'))
            .matches(/^[A-Z]{3}$/)
            .withMessage('半角英字3文字で入力してください')
    ];
}
exports.validate = validate;
function createFromBody(req, __) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        return {
            id: req.body.id,
            typeOf: sdk_1.chevre.factory.organizationType.Project,
            logo: req.body.logo,
            name: req.body.name,
            alternateName: req.body.alternateName,
            settings: Object.assign({}, (typeof ((_a = req.body.settings) === null || _a === void 0 ? void 0 : _a.sendgridApiKey) === 'string')
                ? { sendgridApiKey: req.body.settings.sendgridApiKey }
                : undefined)
        };
    });
}
exports.createFromBody = createFromBody;
settingsRouter.post('/aggregate', (__1, __2, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        throw new Error('implementing...');
        // const taskService = new chevre.service.Task({
        //     endpoint: <string>process.env.API_ENDPOINT,
        //     auth: req.user.authClient,
        //     project: { id: req.project.id }
        // });
        // const task = await taskService.create({
        //     name: chevre.factory.taskName.AggregateOnProject,
        //     project: { typeOf: req.project.typeOf, id: req.project.id },
        //     runsAt: new Date(),
        //     data: {
        //         project: { id: req.project.id },
        //         reservationFor: {
        //             startFrom: moment()
        //                 .tz('Asia/Tokyo')
        //                 .startOf('month')
        //                 .toDate(),
        //             startThrough: moment()
        //                 .tz('Asia/Tokyo')
        //                 .endOf('month')
        //                 .toDate()
        //         }
        //     },
        //     status: chevre.factory.taskStatus.Ready,
        //     numberOfTried: 0,
        //     remainingNumberOfTries: 3,
        //     executionResults: []
        // });
        // res.json(task);
    }
    catch (err) {
        next(err);
    }
}));
exports.default = settingsRouter;
