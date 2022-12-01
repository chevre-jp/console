"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const http_status_1 = require("http-status");
function errorHandler(err, req, res, next) {
    var _a;
    if (res.headersSent) {
        next(err);
        return;
    }
    try {
        // エラーオブジェクトの場合は、キャッチされた例外でクライント依存のエラーの可能性が高い
        if (err instanceof Error) {
            if (err.message === 'invalid_grant') {
                res.redirect('/logout');
                return;
            }
            if (typeof ((_a = req.project) === null || _a === void 0 ? void 0 : _a.id) === 'string') {
                res.status(http_status_1.BAD_REQUEST)
                    .render('error/badRequest', {
                    message: err.message
                });
            }
            else {
                res.status(http_status_1.BAD_REQUEST)
                    .render('error/badRequest', {
                    message: err.message,
                    layout: 'layouts/error'
                });
            }
        }
        else {
            res.status(http_status_1.INTERNAL_SERVER_ERROR)
                .render('error/internalServerError', {
                message: 'an unexpected error occurred',
                layout: 'layouts/error'
            });
        }
    }
    catch (error) {
        next(err);
    }
}
exports.errorHandler = errorHandler;
