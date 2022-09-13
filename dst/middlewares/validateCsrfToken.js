"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCsrfToken = void 0;
const Tokens = require("csrf");
const http_status_1 = require("http-status");
const moment = require("moment");
function validateCsrfToken(req, res, next) {
    var _a, _b;
    try {
        if (req.method === 'POST') {
            const tokens = new Tokens();
            const { session, body: { csrfToken } } = req;
            const csrfTokenValue = (_a = session === null || session === void 0 ? void 0 : session.csrfSecret) === null || _a === void 0 ? void 0 : _a.value;
            if (!tokens.verify(csrfTokenValue, csrfToken)) {
                throw new Error('invalid form token');
            }
            else {
                const secretCreateDate = (_b = session === null || session === void 0 ? void 0 : session.csrfSecret) === null || _b === void 0 ? void 0 : _b.createDate;
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
    }
    catch (error) {
        if (req.xhr) {
            res.status(http_status_1.BAD_REQUEST)
                .json({
                message: error.message
            });
        }
        else {
            next(error);
        }
    }
}
exports.validateCsrfToken = validateCsrfToken;
