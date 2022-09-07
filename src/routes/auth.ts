/**
 * 認証ルーター
 */
import * as express from 'express';

import { User } from '../user';

const authRouter = express.Router();

/**
 * サインイン
 * Cognitoからリダイレクトしてくる
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
authRouter.get(
    '/signIn',
    async (req, res, next) => {
        try {
            const user = new User({
                host: req.hostname,
                session: <Express.Session>req.session
            });

            await user.signIn(req.query.code);

            // 記憶されたリクエストURLがあれば利用する
            const originalUrl = (<Express.Session>req.session).originalUrl;
            if (typeof originalUrl === 'string' && originalUrl.length > 0) {
                res.redirect(originalUrl);
            } else {
                res.redirect('/');
            }
        } catch (error) {
            next(error);
        }
    });

/**
 * ログアウト
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
authRouter.get(
    '/logout',
    async (req, res, next) => {
        try {
            const user = new User({
                host: req.hostname,
                session: <Express.Session>req.session
            });
            user.logout();
            res.redirect('/');
        } catch (error) {
            next(error);
        }
    });

export { authRouter };
