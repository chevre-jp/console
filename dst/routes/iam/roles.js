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
 * IAMロールルーター
 */
const sdk_1 = require("@cinerino/sdk");
const express_1 = require("express");
const http_status_1 = require("http-status");
const iamRolesRouter = express_1.Router();
iamRolesRouter.get('', (__, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.render('iam/roles/index', {
        message: '',
        TaskName: sdk_1.chevre.factory.taskName,
        TaskStatus: sdk_1.chevre.factory.taskStatus
    });
}));
iamRolesRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const iamService = new sdk_1.chevre.service.IAM({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const searchConditions = {
            limit: req.query.limit,
            page: req.query.page,
            roleName: (typeof ((_a = req.query.roleName) === null || _a === void 0 ? void 0 : _a.$eq) === 'string' && req.query.roleName.$eq.length > 0)
                ? { $eq: req.query.roleName.$eq }
                : undefined
        };
        const { data } = yield iamService.searchRoles(searchConditions);
        res.json({
            success: true,
            count: (data.length === Number(searchConditions.limit))
                ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
            results: data.map((r) => {
                return Object.assign(Object.assign({}, r), { permissionsStr: (Array.isArray(r.permissions))
                        ? r.permissions
                            .map((p) => `<span class="badge badge-secondary">${p}</span>`)
                            .join(' ')
                        : '', numPermissions: (Array.isArray(r.permissions))
                        ? r.permissions.length
                        : 0 });
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
exports.default = iamRolesRouter;
