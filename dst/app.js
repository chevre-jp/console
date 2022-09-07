"use strict";
/**
 * expressアプリケーション
 */
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
// tslint:disable-next-line:no-require-imports no-var-requires
const flash = require("express-flash");
// tslint:disable-next-line:no-require-imports
// import expressValidator = require('express-validator');
const helmet = require("helmet");
const multer = require("multer");
const favicon = require("serve-favicon");
// tslint:disable-next-line:no-var-requires no-require-imports
const expressLayouts = require('express-ejs-layouts');
// ミドルウェア
const errorHandler_1 = require("./middlewares/errorHandler");
const locals_1 = require("./middlewares/locals");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const session_1 = require("./middlewares/session");
// ルーター
const router_1 = require("./routes/router");
const app = express();
app.use(cors()); // enable All CORS Requests
app.use(helmet());
app.use(session_1.default); // セッション
app.use(flash());
app.use(locals_1.default); // テンプレート変数
app.set('etag', 'strong');
// view engine setup
app.set('views', `${__dirname}/../views`);
app.set('view engine', 'ejs');
app.use(expressLayouts);
// app.set('layout extractScripts', true);
// tslint:disable-next-line:no-backbone-get-set-outside-model
app.set('layout', 'layouts/layout');
// api version
// tslint:disable-next-line:no-require-imports no-var-requires
const packageInfo = require('../package.json');
app.use((__, res, next) => {
    res.setHeader('x-api-version', packageInfo.version);
    res.locals.version = packageInfo.version;
    next();
});
// uncomment after placing your favicon in /public
app.use(favicon(`${__dirname}/../public/favicon.ico`));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
// for parsing multipart/form-data
const storage = multer.memoryStorage();
app.use(multer({ storage: storage })
    .any());
app.use(cookieParser());
app.use(express.static(`${__dirname}/../public`));
app.use('/node_modules', express.static(`${__dirname}/../node_modules`));
// app.use(expressValidator()); // バリデーション
app.use(router_1.router);
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
module.exports = app;
