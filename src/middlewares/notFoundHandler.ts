/**
 * 404ハンドラーミドルウェア
 */
import { Request, Response } from 'express';
import { NOT_FOUND } from 'http-status';

export function notFoundHandler(req: Request, res: Response) {
    res.status(NOT_FOUND)
        .render('error/notFound', {
            message: `router for [${req.originalUrl}] not found.`,
            layout: 'layouts/error'
        });
}
