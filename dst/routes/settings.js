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
exports.createFromBody = exports.validate = exports.NUM_ORDER_WEBHOOKS = void 0;
/**
 * プロジェクトルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const moment = require("moment-timezone");
const Message = require("../message");
const DEFAULT_EMAIL_SENDER = process.env.DEFAULT_EMAIL_SENDER;
const NAME_MAX_LENGTH_NAME = 64;
exports.NUM_ORDER_WEBHOOKS = 2;
const settingsRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
settingsRouter.all('', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
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
        const forms = Object.assign(Object.assign({ orderWebhooks: (Array.isArray((_b = (_a = project.settings) === null || _a === void 0 ? void 0 : _a.onOrderStatusChanged) === null || _b === void 0 ? void 0 : _b.informOrder))
                ? (_d = (_c = project.settings) === null || _c === void 0 ? void 0 : _c.onOrderStatusChanged) === null || _d === void 0 ? void 0 : _d.informOrder.map((i) => {
                    var _a, _b;
                    return { name: (_a = i.recipient) === null || _a === void 0 ? void 0 : _a.name, url: (_b = i.recipient) === null || _b === void 0 ? void 0 : _b.url };
                }) : [] }, project), req.body);
        if (req.method === 'POST') {
            // no op
        }
        else {
            if (forms.orderWebhooks.length < exports.NUM_ORDER_WEBHOOKS) {
                // tslint:disable-next-line:prefer-array-literal
                forms.orderWebhooks.push(...[...Array(exports.NUM_ORDER_WEBHOOKS - forms.orderWebhooks.length)].map(() => {
                    return {};
                }));
            }
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
            .matches(/^[0-9a-zA-Z\-]+$/)
            .isLength({ min: 5, max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('ID', 30)),
        express_validator_1.body(['name'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
    ];
}
exports.validate = validate;
function createFromBody(req, __) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        let orderWebhooks = [];
        if (Array.isArray(req.body.orderWebhooks)) {
            orderWebhooks = req.body.orderWebhooks
                .filter((w) => String(w.name).length > 0 && String(w.url).length > 0)
                .map((w) => {
                return { recipient: { name: String(w.name), url: String(w.url) } };
            });
        }
        return {
            id: req.body.id,
            typeOf: sdk_1.chevre.factory.organizationType.Project,
            logo: req.body.logo,
            name: req.body.name,
            // parentOrganization: params.parentOrganization,
            settings: Object.assign({ cognito: {
                    customerUserPool: {
                        id: (_c = (_b = (_a = req.body.settings) === null || _a === void 0 ? void 0 : _a.cognito) === null || _b === void 0 ? void 0 : _b.customerUserPool) === null || _c === void 0 ? void 0 : _c.id
                    }
                }, 
                // onOrderStatusChanged: {
                //     ...req.body.settings?.onOrderStatusChanged,
                //     ...(Array.isArray(req.body.settings?.onOrderStatusChanged?.informOrder))
                //         ? { informOrder: req.body.settings.onOrderStatusChanged.informOrder }
                //         : undefined
                // },
                onOrderStatusChanged: {
                    informOrder: orderWebhooks
                } }, (typeof ((_d = req.body.settings) === null || _d === void 0 ? void 0 : _d.sendgridApiKey) === 'string')
                ? { sendgridApiKey: req.body.settings.sendgridApiKey }
                : undefined)
        };
    });
}
exports.createFromBody = createFromBody;
settingsRouter.post('/aggregate', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const task = yield taskService.create({
            name: sdk_1.chevre.factory.taskName.AggregateOnProject,
            project: { typeOf: req.project.typeOf, id: req.project.id },
            runsAt: new Date(),
            data: {
                project: { id: req.project.id },
                reservationFor: {
                    startFrom: moment()
                        .tz('Asia/Tokyo')
                        .startOf('month')
                        .toDate(),
                    startThrough: moment()
                        .tz('Asia/Tokyo')
                        .endOf('month')
                        .toDate()
                }
            },
            status: sdk_1.chevre.factory.taskStatus.Ready,
            numberOfTried: 0,
            remainingNumberOfTries: 3,
            executionResults: []
        });
        res.json(task);
    }
    catch (err) {
        next(err);
    }
}));
settingsRouter.post('/createReservationReport', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let eventStartFrom;
        let eventStartThrough;
        eventStartFrom = moment()
            .tz('Asia/Tokyo')
            .add(-1, 'month')
            .startOf('month')
            .toDate();
        eventStartThrough = moment()
            .tz('Asia/Tokyo')
            .add(-1, 'month')
            .endOf('month')
            .toDate();
        const startDay = moment(eventStartFrom)
            .tz('Asia/Tokyo')
            .format('YYYYMMDD');
        const endDay = moment(eventStartThrough)
            .tz('Asia/Tokyo')
            .format('YYYYMMDD');
        const reportName = `ReservationReport[${startDay}-${endDay}]`;
        const expires = moment()
            .add(1, 'day')
            .toDate();
        const recipientEmail = (typeof req.body.recipientEmail === 'string' && req.body.recipientEmail.length > 0)
            ? req.body.recipientEmail
            : req.user.profile.email;
        const taskService = new sdk_1.chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const task = yield taskService.create({
            name: 'createReservationReport',
            project: { typeOf: req.project.typeOf, id: req.project.id },
            runsAt: new Date(),
            data: {
                typeOf: sdk_1.chevre.factory.actionType.CreateAction,
                project: { typeOf: req.project.typeOf, id: req.project.id },
                agent: {
                    typeOf: sdk_1.chevre.factory.personType.Person,
                    id: req.user.profile.sub,
                    familyName: req.user.profile.family_name,
                    givenName: req.user.profile.given_name,
                    name: `${req.user.profile.given_name} ${req.user.profile.family_name}`
                },
                // recipient: { name: 'recipientName' },
                object: {
                    typeOf: 'Report',
                    about: reportName,
                    mentions: {
                        typeOf: 'SearchAction',
                        query: {
                            reservationFor: Object.assign(Object.assign({}, (eventStartFrom instanceof Date) ? { startFrom: eventStartFrom } : undefined), (eventStartThrough instanceof Date) ? { startThrough: eventStartThrough } : undefined)
                        },
                        object: {
                            typeOf: 'Reservation'
                        }
                    },
                    encodingFormat: 'text/csv',
                    expires: expires
                },
                potentialActions: {
                    sendEmailMessage: [
                        {
                            object: {
                                about: `レポートが使用可能です [${req.project.id}]`,
                                sender: {
                                    name: `Chevre Report [${req.project.id}]`,
                                    email: (typeof DEFAULT_EMAIL_SENDER === 'string' && DEFAULT_EMAIL_SENDER.length > 0)
                                        ? DEFAULT_EMAIL_SENDER
                                        : 'noreply@example.com'
                                },
                                toRecipient: { email: recipientEmail }
                            }
                        }
                    ]
                }
            },
            status: sdk_1.chevre.factory.taskStatus.Ready,
            numberOfTried: 0,
            remainingNumberOfTries: 3,
            executionResults: []
        });
        res.json(task);
    }
    catch (err) {
        next(err);
    }
}));
exports.default = settingsRouter;
