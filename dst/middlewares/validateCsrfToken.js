"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCsrfToken = void 0;
const Tokens = require("csrf");
const moment = require("moment");
function validateCsrfToken(req, __, next) {
    var _a, _b;
    if (req.method === 'POST') {
        const tokens = new Tokens();
        const { session, body: { csrfToken } } = req;
        const csrfTokenValue = (_a = session === null || session === void 0 ? void 0 : session.csrfSecret) === null || _a === void 0 ? void 0 : _a.value;
        if (!tokens.verify(csrfTokenValue, csrfToken)) {
            // <- 確認画面に仕込んだhiddenのtokenを検証
            next(new Error('invalid token'));
            return;
        }
        else {
            const secretCreateDate = (_b = session === null || session === void 0 ? void 0 : session.csrfSecret) === null || _b === void 0 ? void 0 : _b.createDate;
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
exports.validateCsrfToken = validateCsrfToken;
