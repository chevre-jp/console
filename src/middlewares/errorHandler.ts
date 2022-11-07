/**
 * エラーハンドラーミドルウェア
 */
import { NextFunction, Request, Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from 'http-status';

export function errorHandler(err: any, _: Request, res: Response, next: NextFunction) {
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

        res.status(BAD_REQUEST)
            .render('error/badRequest', {
                message: err.message
                // layout: 'layouts/error'
            });
    } else {
        res.status(INTERNAL_SERVER_ERROR)
            .render('error/internalServerError', {
                message: 'an unexpected error occurred',
                layout: 'layouts/error'
            });
    }
}
