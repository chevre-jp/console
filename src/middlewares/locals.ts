/**
 * テンプレート変数引渡しミドルウェア
 */
import { NextFunction, Request, Response } from 'express';

export function locals(req: Request, res: Response, next: NextFunction) {
    res.locals.req = req;

    next();
}
