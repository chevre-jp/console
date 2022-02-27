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
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../../message");
const CUSTOMER_USER_POOL_ID_NEW = String(process.env.CUSTOMER_USER_POOL_ID_NEW);
const iamMembersRouter = express_1.Router();
// tslint:disable-next-line:use-default-type-parameter
iamMembersRouter.all('/new', (req, __, next) => {
    try {
        // user選択をmember.idに保管
        if (typeof req.body.user === 'string' && req.body.user.length > 0) {
            const selectedUser = JSON.parse(req.body.user);
            if (req.body.member === undefined || req.body.member === null) {
                req.body.member = {};
            }
            req.body.member.id = selectedUser.id;
        }
        next();
    }
    catch (error) {
        next(error);
    }
}, ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const iamService = new sdk_1.chevre.service.IAM({
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
                const memberAttributes = createFromBody(req, true);
                const iamMember = yield iamService.createMember(memberAttributes);
                req.flash('message', '登録しました');
                res.redirect(`/projects/${req.project.id}/iam/members/${iamMember.member.id}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ roleName: [], member: {} }, req.body);
    if (req.method === 'POST') {
        // 対応決済方法を補完
        // if (Array.isArray(req.body.paymentAccepted) && req.body.paymentAccepted.length > 0) {
        //     forms.paymentAccepted = (<string[]>req.body.paymentAccepted).map((v) => JSON.parse(v));
        // } else {
        //     forms.paymentAccepted = [];
        // }
    }
    else {
        // if (Array.isArray(member.member.hasRole) && member.member.hasRole.length > 0) {
        //     forms.roleNames = member.member.hasRole.map((r) => {
        //         return r.roleName;
        //     });
        // } else {
        //     forms.roleNames = [];
        // }
    }
    if (req.method === 'POST') {
        // プロジェクトメンバーを保管
        if (typeof req.body.user === 'string' && req.body.user.length > 0) {
            forms.user = JSON.parse(req.body.user);
        }
        else {
            forms.user = undefined;
        }
    }
    const searchRolesResult = yield iamService.searchRoles({ limit: 100 });
    res.render('iam/members/new', {
        message: message,
        errors: errors,
        forms: forms,
        roles: searchRolesResult.data
    });
}));
iamMembersRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('iam/members/index', {
        message: '',
        TaskName: sdk_1.chevre.factory.taskName,
        TaskStatus: sdk_1.chevre.factory.taskStatus
    });
}));
iamMembersRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            member: {
                hasRole: {
                    roleName: {
                        $eq: (typeof ((_b = (_a = req.query.member) === null || _a === void 0 ? void 0 : _a.hasRole) === null || _b === void 0 ? void 0 : _b.roleName) === 'string'
                            && req.query.member.hasRole.roleName.length > 0)
                            ? req.query.member.hasRole.roleName
                            : undefined
                    }
                },
                typeOf: {
                    $eq: (typeof ((_d = (_c = req.query.member) === null || _c === void 0 ? void 0 : _c.typeOf) === null || _d === void 0 ? void 0 : _d.$eq) === 'string' && req.query.member.typeOf.$eq.length > 0)
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
iamMembersRouter.all('/:id/update', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    let message = '';
    let errors = {};
    const iamService = new sdk_1.chevre.service.IAM({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient,
        project: { id: req.project.id }
    });
    const userPoolService = new sdk_1.chevre.service.UserPool({
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
        const forms = Object.assign(Object.assign({ roleName: [] }, member), req.body);
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
                forms.roleName = member.member.hasRole.map((r) => {
                    return r.roleName;
                });
            }
            else {
                forms.roleName = [];
            }
        }
        const searchRolesResult = yield iamService.searchRoles({ limit: 100 });
        // Cognitoユーザープール検索
        // let userPoolClient: chevre.factory.cognito.UserPoolClientType | undefined;
        let userPoolClient;
        let profile;
        try {
            if (member.member.typeOf === sdk_1.chevre.factory.creativeWorkType.WebApplication) {
                userPoolClient = yield userPoolService.findClientById({
                    userPoolId: CUSTOMER_USER_POOL_ID_NEW,
                    clientId: req.params.id
                });
            }
            else if (member.member.typeOf === sdk_1.chevre.factory.personType.Person) {
                profile = yield iamService.getMemberProfile({ member: { id: req.params.id } });
            }
        }
        catch (error) {
            console.error(error);
        }
        res.render('iam/members/update', {
            message: message,
            errors: errors,
            forms: forms,
            roles: searchRolesResult.data,
            userPoolClient,
            profile
        });
    }
    catch (error) {
        next(error);
    }
}));
iamMembersRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        // await preDelete(req, seller);
        yield iamService.deleteMember({
            member: { id: req.params.id }
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        res.status(http_status_1.BAD_REQUEST)
            .json({ error: { message: error.message } });
    }
}));
function createFromBody(req, __) {
    var _a, _b, _c;
    const hasRole = (Array.isArray(req.body.roleName))
        ? req.body.roleName
            .filter((r) => typeof r === 'string' && r.length > 0)
            .map((r) => {
            return {
                roleName: String(r)
            };
        })
        : [];
    const memberId = (_a = req.body.member) === null || _a === void 0 ? void 0 : _a.id;
    // if (isNew) {
    //     if (req.body.member.typeOf === chevre.factory.personType.Person) {
    //         const selectedUser = JSON.parse(req.body.user);
    //         memberId = selectedUser.id;
    //     }
    // }
    return {
        member: Object.assign({ applicationCategory: (req.body.member !== undefined && req.body.member !== null)
                ? req.body.member.applicationCategory : '', typeOf: (req.body.member !== undefined && req.body.member !== null)
                ? req.body.member.typeOf : '', id: memberId, hasRole: hasRole }, (typeof ((_b = req.body.member) === null || _b === void 0 ? void 0 : _b.name) === 'string') ? { name: (_c = req.body.member) === null || _c === void 0 ? void 0 : _c.name } : undefined)
    };
}
function validate() {
    return [
        express_validator_1.body('member.typeOf')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバータイプ')),
        express_validator_1.body('member.id')
            // .if((_: any, { req }: Meta) => req.body.member?.typeOf === chevre.factory.creativeWorkType.WebApplication)
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーID'))
        // body('user')
        //     .if((_: any, { req }: Meta) => req.body.member?.typeOf === chevre.factory.personType.Person)
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーID'))
        // body(['name.ja', 'name.en'])
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
        //     .isLength({ max: NAME_MAX_LENGTH_NAME })
        //     .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
    ];
}
exports.default = iamMembersRouter;
