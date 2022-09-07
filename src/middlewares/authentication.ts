/**
 * 認証ミドルウェア
 */
import { NextFunction, Request, Response } from 'express';

import { User } from '../user';

export default async (req: Request, res: Response, next: NextFunction) => {
    try {
        req.user = new User({
            host: req.hostname,
            session: <Express.Session>req.session
        });

        if (!req.user.isAuthenticated()) {
            // ログインページへリダイレクト
            // リクエストURLを記憶する
            (<Express.Session>req.session).originalUrl = req.originalUrl;
            res.redirect(req.user.generateAuthUrl());

            return;
        }

        await req.user.retrieveProfile();
        res.locals.user = req.user;
        next();
    } catch (error) {
        next(error);
    }
};
