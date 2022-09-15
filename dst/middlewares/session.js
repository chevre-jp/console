"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.session = void 0;
/**
 * セッションミドルウェア
 */
const connectRedis = require("connect-redis");
const expressSession = require("express-session");
const redis = require("redis");
const redisStore = connectRedis(expressSession);
const COOKIE_MAX_AGE = 3600000; // 60 * 60 * 1000(session active 1 hour)
exports.session = expressSession({
    secret: 'chevre-backend-secret',
    resave: false,
    // Force a session identifier cookie to be set on every response.
    // The expiration is reset to the original maxAge, resetting the expiration countdown.
    rolling: true,
    saveUninitialized: false,
    store: new redisStore({
        client: redis.createClient({
            port: Number(process.env.REDIS_PORT),
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_KEY,
            tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
        })
    }),
    cookie: {
        maxAge: COOKIE_MAX_AGE
    }
});
