/**
 * IAMメンバールーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, oneOf, validationResult } from 'express-validator';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';

import * as Message from '../../message';

const CUSTOMER_USER_POOL_ID_NEW = String(process.env.CUSTOMER_USER_POOL_ID_NEW);

const iamMembersRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
iamMembersRouter.all<ParamsDictionary>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const iamService = new chevre.service.IAM({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.method === 'POST') {
            // 検証
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    const memberAttributes = createFromBody(req, true);
                    const iamMembers = await iamService.createMember(memberAttributes);
                    req.flash('message', '登録しました');
                    res.redirect(`/projects/${req.project.id}/iam/members/${iamMembers[0]?.member.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            roleName: [],
            member: {},
            ...req.body
        };

        if (req.method === 'POST') {
            // プロジェクトメンバーを保管
            if (typeof req.body.user === 'string' && req.body.user.length > 0) {
                forms.user = [JSON.parse(req.body.user)];
            } else if (Array.isArray(req.body.user)) {
                forms.user = req.body.user.map((userJson: any) => {
                    return JSON.parse(String(userJson));
                });
            } else {
                forms.user = undefined;
            }
        }

        const searchRolesResult = await iamService.searchRoles({ limit: 100 });

        res.render('iam/members/new', {
            message: message,
            errors: errors,
            forms: forms,
            roles: searchRolesResult.data
        });
    }
);

iamMembersRouter.get(
    '',
    async (__, res) => {
        res.render('iam/members/index', {
            message: '',
            TaskName: chevre.factory.taskName,
            TaskStatus: chevre.factory.taskStatus
        });
    }
);

iamMembersRouter.get(
    '/search',
    async (req, res) => {
        try {
            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const searchConditions: chevre.factory.iam.ISearchConditions = {
                limit: req.query.limit,
                page: req.query.page,
                member: {
                    hasRole: {
                        roleName: {
                            $eq: (typeof req.query.member?.hasRole?.roleName === 'string'
                                && req.query.member.hasRole.roleName.length > 0)
                                ? req.query.member.hasRole.roleName
                                : undefined
                        }
                    },
                    typeOf: {
                        $eq: (typeof req.query.member?.typeOf?.$eq === 'string' && req.query.member.typeOf.$eq.length > 0)
                            ? req.query.member.typeOf.$eq
                            : undefined
                    }
                }
            };
            const { data } = await iamService.searchMembers(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(searchConditions.limit))
                    ? (Number(searchConditions.page) * Number(searchConditions.limit)) + 1
                    : ((Number(searchConditions.page) - 1) * Number(searchConditions.limit)) + Number(data.length),
                results: data.map((m) => {
                    return {
                        ...m,
                        rolesStr: m.member.hasRole
                            .map((r) => `<span class="badge badge-light">${r.roleName}</span>`)
                            .join(' ')
                    };
                })
            });
        } catch (err) {
            res.status((typeof err.code === 'number') ? err.code : INTERNAL_SERVER_ERROR)
                .json({
                    success: false,
                    count: 0,
                    results: []
                });
        }
    }
);

// tslint:disable-next-line:use-default-type-parameter
iamMembersRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const iamService = new chevre.service.IAM({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });
        const userPoolService = new chevre.service.UserPool({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            const member = await iamService.findMemberById({ member: { id: req.params.id } });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        const members = createFromBody(req, false);
                        await iamService.updateMember({
                            member: {
                                id: req.params.id,
                                hasRole: members[0].member.hasRole,
                                ...(typeof members[0].member.name === 'string') ? { name: members[0].member.name } : undefined
                            }
                        });
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                roleName: [],
                ...member,
                ...req.body
            };

            if (req.method === 'POST') {
                // no op
            } else {
                if (Array.isArray(member.member.hasRole) && member.member.hasRole.length > 0) {
                    forms.roleName = member.member.hasRole.map((r) => {
                        return r.roleName;
                    });
                } else {
                    forms.roleName = [];
                }
            }

            const searchRolesResult = await iamService.searchRoles({ limit: 100 });

            // Cognitoユーザープール検索
            let userPoolClient: any;
            let profile: chevre.factory.person.IProfile | undefined;
            try {
                if (member.member.typeOf === chevre.factory.creativeWorkType.WebApplication) {
                    userPoolClient = await userPoolService.findClientById({
                        userPoolId: CUSTOMER_USER_POOL_ID_NEW,
                        clientId: req.params.id
                    });
                } else if (member.member.typeOf === chevre.factory.personType.Person) {
                    profile = await iamService.getMemberProfile({ member: { id: req.params.id } });
                }
            } catch (error) {
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
        } catch (error) {
            next(error);
        }
    }
);

iamMembersRouter.delete(
    '/:id',
    async (req, res) => {
        try {
            const iamService = new chevre.service.IAM({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            // await preDelete(req, seller);
            await iamService.deleteMember({
                member: { id: req.params.id }
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            res.status(BAD_REQUEST)
                .json({ error: { message: error.message } });
        }
    }
);

function createFromBody(
    req: Request, __: boolean
): chevre.factory.iam.IMember[] {
    const hasRole: chevre.factory.iam.IMemberHasRole = (Array.isArray(req.body.roleName))
        ? (<string[]>req.body.roleName)
            .filter((r) => typeof r === 'string' && r.length > 0)
            .map((r) => {
                return {
                    typeOf: chevre.factory.iam.RoleType.OrganizationRole,
                    roleName: String(r),
                    memberOf: { id: req.project.id, typeOf: chevre.factory.organizationType.Project }
                };
            })
        : [];

    const memberType: chevre.factory.iam.IMemberType = req.body.member?.typeOf;

    let members: chevre.factory.iam.IMember[] = [];
    const memberId = req.body.member?.id;
    if (typeof memberId === 'string' && memberId.length > 0) {
        members = [{
            typeOf: chevre.factory.iam.RoleType.OrganizationRole,
            project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
            member: {
                // applicationCategory: 'admin',
                typeOf: memberType,
                id: memberId,
                hasRole,
                ...(typeof req.body.member?.name === 'string') ? { name: req.body.member?.name } : undefined
            }
        }];
    } else {
        // body.userからメンバーリストを作成
        if (typeof req.body.user === 'string' && req.body.user.length > 0) {
            const selectedUser = JSON.parse(req.body.user);
            members = [{
                typeOf: chevre.factory.iam.RoleType.OrganizationRole,
                project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
                member: {
                    typeOf: memberType,
                    id: String(selectedUser.id),
                    hasRole,
                    ...(typeof req.body.member?.name === 'string') ? { name: req.body.member?.name } : undefined
                }
            }];
        } else if (Array.isArray(req.body.user)) {
            members = req.body.user.map((userJson: any) => {
                const selectedUser = JSON.parse(String(userJson));

                return {
                    typeOf: chevre.factory.iam.RoleType.OrganizationRole,
                    project: { id: req.project.id, typeOf: chevre.factory.organizationType.Project },
                    member: {
                        typeOf: memberType,
                        id: String(selectedUser.id),
                        hasRole,
                        ...(typeof req.body.member?.name === 'string') ? { name: req.body.member?.name } : undefined
                    }
                };
            });
        } else {
            throw new Error('メンバーIDが未選択です');
        }
    }

    return members;
}

function validate() {
    return [
        body('member.typeOf')
            .not()
            .isEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'メンバータイプ')),
        oneOf([
            [
                body('user')
                    // .if((_: any, { req }: Meta) => req.body.member?.typeOf === chevre.factory.creativeWorkType.WebApplication)
                    .not()
                    .isEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーID'))
            ],
            [
                body('member.id')
                    // .if((_: any, { req }: Meta) => req.body.member?.typeOf === chevre.factory.creativeWorkType.WebApplication)
                    .not()
                    .isEmpty()
                    .withMessage(Message.Common.required.replace('$fieldName$', 'メンバーID'))
            ]
        ])

    ];
}

export { iamMembersRouter };
