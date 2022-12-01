/**
 * 404ハンドラーミドルウェア
 */
import { NextFunction, Request, Response } from 'express';
import { NOT_FOUND } from 'http-status';

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    try {
        res.status(NOT_FOUND)
            .render('error/notFound', {
                message: `router for [${req.originalUrl}] not found.`,
                layout: 'layouts/error'
            });
    } catch (error) {
        next(error);
    }
}
