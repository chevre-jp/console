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
 * IAMメンバールーター
 */
const chevre = require("@chevre/api-nodejs-client");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../../message");
const iamMembersRouter = express_1.Router();
iamMembersRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('iam/members/index', {
        message: '',
        TaskName: chevre.factory.taskName,
        TaskStatus: chevre.factory.taskStatus
    });
}));
iamMembersRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const iamService = new chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            member: {
                typeOf: {
                    $eq: (typeof ((_b = (_a = req.query.member) === null || _a === void 0 ? void 0 : _a.typeOf) === null || _b === void 0 ? void 0 : _b.$eq) === 'string' && req.query.member.typeOf.$eq.length > 0)
                        ? req.query.member.typeOf.$eq
                        : undefined
                }
            }
        };
        const { data } = yield iamService.searchMembers(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((m) => {
                return Object.assign(Object.assign({}, m), { rolesStr: m.member.hasRole
                        .map((r) => `<span class="badge badge-light">${r.roleName}</span>`)
                        .join(' ') });
            })
        });
    }
    catch (err) {
        res.status((typeof err.code === 'number') ? err.code : http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
iamMembersRouter.all('/:id/update', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const iamService = new chevre.service.IAM({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    try {
        let member = yield iamService.findMemberById({ member: { id: req.params.id } });
        if (req.method === 'POST') {
            // 検証
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    member = yield createFromBody(req, false);
                    yield iamService.updateMember({
                        member: Object.assign({ id: req.params.id, hasRole: member.member.hasRole }, (typeof member.member.name === 'string') ? { name: member.member.name } : undefined)
                    });
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({ roleNames: [] }, member), req.body);
        if (req.method === 'POST') {
            // 対応決済方法を補完
            // if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
            //     forms.paymentAccepted = (<string[]>req.body.paymentAccepted).map((v) => JSON.parse(v));
            // } else {
            //     forms.paymentAccepted = [];
            // }
        }
        else {
            if (Array.isArray(member.member.hasRole) && member.member.hasRole.length > 0) {
                forms.roleNames = member.member.hasRole.map((r) => {
                    return r.roleName;
                });
            }
            else {
                forms.roleNames = [];
            }
        }
        const searchRolesResult = yield iamService.searchRoles({ limit: 100 });
        res.render('iam/members/update', {
            message: message,
            errors: errors,
            forms: forms,
            roles: searchRolesResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
function createFromBody(req, __) {
    var _a, _b;
    const hasRole = (Array.isArray(req.body.roleName))
        ? req.body.roleName
            .filter((r) => typeof r === 'string' && r.length > 0)
            .map((r) => {
            return {
                roleName: String(r)
            };
        })
        : [];
    return {
        member: Object.assign({ applicationCategory: (req.body.member !== undefined && req.body.member !== null)
                ? req.body.member.applicationCategory : '', typeOf: (req.body.member !== undefined && req.body.member !== null)
                ? req.body.member.typeOf : '', id: (req.body.member !== undefined && req.body.member !== null)
                ? req.body.member.id : '', hasRole: hasRole }, (typeof ((_a = req.body.member) === null || _a === void 0 ? void 0 : _a.name) === 'string') ? { name: (_b = req.body.member) === null || _b === void 0 ? void 0 : _b.name } : undefined)
    };
}
function validate() {
    return [
        express_validator_1.body('member.typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバータイプ'))
        // body(['name.ja', 'name.en'])
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
        //     .isLength({ max: NAME_MAX_LENGTH_NAME })
        //     .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
    ];
}
exports.default = iamMembersRouter;
