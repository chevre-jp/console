/**
 * プロジェクトルーター
 */
import { chevre } from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import * as moment from 'moment-timezone';

import * as Message from '../message';

const DEFAULT_EMAIL_SENDER = process.env.DEFAULT_EMAIL_SENDER;
const NAME_MAX_LENGTH_NAME = 64;

const settingsRouter = Router();

// tslint:disable-next-line:use-default-type-parameter
settingsRouter.all<ParamsDictionary>(
    '',
    ...validate(),
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const projectService = new chevre.service.Project({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: '' }
            });

            let project = await projectService.findById({ id: req.project.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        // req.body.id = req.params.id;
                        project = await createFromBody(req, false);
                        await projectService.update(project);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                ...project,
                ...req.body
            };

            if (req.method === 'POST') {
                // no op
            } else {
                // no op
            }

            res.render('projects/settings', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (err) {
            next(err);
        }
    }
);

export function validate() {
    return [
        body('id')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ID'))
            .matches(/^[0-9a-zA-Z\-]+$/)
            .isLength({ min: 5, max: 30 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('ID', 30)),

        body(['name'])
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_NAME))
    ];
}

export async function createFromBody(
    req: Request, __: boolean
): Promise<chevre.factory.project.IProject> {
    return {
        id: req.body.id,
        typeOf: chevre.factory.organizationType.Project,
        logo: req.body.logo,
        name: req.body.name,
        settings: {
            // cognito: {
            //     customerUserPool: {
            //         id: req.body.settings?.cognito?.customerUserPool?.id
            //     }
            // },
            // useUsernameAsGMOMemberId: false,
            ...(typeof req.body.settings?.sendgridApiKey === 'string')
                ? { sendgridApiKey: req.body.settings.sendgridApiKey }
                : undefined
        }
    };
}

settingsRouter.post(
    '/aggregate',
    async (req, res, next) => {
        try {
            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const task = await taskService.create({
                name: chevre.factory.taskName.AggregateOnProject,
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
                status: chevre.factory.taskStatus.Ready,
                numberOfTried: 0,
                remainingNumberOfTries: 3,
                executionResults: []
            });

            res.json(task);
        } catch (err) {
            next(err);
        }
    }
);

settingsRouter.post(
    '/createReservationReport',
    async (req, res, next) => {
        try {
            let eventStartFrom: Date | undefined;
            let eventStartThrough: Date | undefined;

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

            const taskService = new chevre.service.Task({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            const task = await taskService.create({
                name: <any>'createReservationReport',
                project: { typeOf: req.project.typeOf, id: req.project.id },
                runsAt: new Date(),
                data: {
                    typeOf: chevre.factory.actionType.CreateAction,
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    agent: {
                        typeOf: chevre.factory.personType.Person,
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
                                reservationFor: {
                                    ...(eventStartFrom instanceof Date) ? { startFrom: eventStartFrom } : undefined,
                                    ...(eventStartThrough instanceof Date) ? { startThrough: eventStartThrough } : undefined
                                }
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
                status: chevre.factory.taskStatus.Ready,
                numberOfTried: 0,
                remainingNumberOfTries: 3,
                executionResults: []
            });

            res.json(task);
        } catch (err) {
            next(err);
        }
    }
);

export default settingsRouter;
