import * as Tokens from 'csrf';
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST } from 'http-status';
import * as moment from 'moment';

export function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
    try {
        if (req.method === 'POST') {
            const tokens = new Tokens();

            const { session, body: { csrfToken } } = req;

            const csrfTokenValue = session?.csrfSecret?.value;
            if (!tokens.verify(csrfTokenValue, csrfToken)) {
                throw new Error('invalid form token');
            } else {
                const secretCreateDate = session?.csrfSecret?.createDate;
                if (secretCreateDate === undefined) {
                    throw new Error('invalid session');
                }

                const someSecondsAgo = moment()
                    // tslint:disable-next-line:no-magic-numbers
                    .add(-5, 'seconds');
                // check createDate
                if (moment(secretCreateDate)
                    .isAfter(someSecondsAgo)) {
                    throw new Error('invalid form operation');
                }
            }
        }

        next();
    } catch (error) {
        if (req.xhr) {
            res.status(BAD_REQUEST)
                .json({
                    message: error.message
                });
        } else {
            next(error);
        }
    }
}
