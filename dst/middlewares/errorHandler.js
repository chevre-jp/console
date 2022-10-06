"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const http_status_1 = require("http-status");
// tslint:disable-next-line:no-suspicious-comment
// TODO errの内容、エラーオブジェクトタイプによって、本来はステータスコードを細かくコントロールするべき
// 現時点では、雑にコントロールしてある
function errorHandler(err, _, res, next) {
    if (res.headersSent) {
        next(err);
        return;
    }
    // エラーオブジェクトの場合は、キャッチされた例外でクライント依存のエラーの可能性が高い
    if (err instanceof Error) {
        if (err.message === 'invalid_grant') {
            res.redirect('/logout');
            return;
        }
        res.status(http_status_1.BAD_REQUEST)
            .render('error/badRequest', {
            message: err.message
            // layout: 'layouts/error'
        });
    }
    else {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .render('error/internalServerError', {
            message: 'an unexpected error occurred',
            layout: 'layouts/error'
        });
    }
}
exports.errorHandler = errorHandler;
