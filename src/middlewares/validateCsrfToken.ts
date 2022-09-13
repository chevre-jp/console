import * as Tokens from 'csrf';
import { NextFunction, Request, Response } from 'express';
import * as moment from 'moment';

export function validateCsrfToken(req: Request, __: Response, next: NextFunction) {
    if (req.method === 'POST') {
        const tokens = new Tokens();

        const { session, body: { csrfToken } } = req;

        const csrfTokenValue = session?.csrfSecret?.value;
        if (!tokens.verify(csrfTokenValue, csrfToken)) {
            // <- 確認画面に仕込んだhiddenのtokenを検証
            next(new Error('invalid token'));

            return;
        } else {
            const secretCreateDate = session?.csrfSecret?.createDate;
            if (secretCreateDate === undefined) {
                next(new Error('invalid session'));

                return;
            }

            const someSecondsAgo = moment()
                // tslint:disable-next-line:no-magic-numbers
                .add(-5, 'seconds');
            // check createDate
            if (moment(secretCreateDate)
                .isAfter(someSecondsAgo)) {
                next(new Error('invalid operation'));

                return;
            }
        }
    }

    next();
}
