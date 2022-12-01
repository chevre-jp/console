"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const http_status_1 = require("http-status");
function notFoundHandler(req, res, next) {
    try {
        res.status(http_status_1.NOT_FOUND)
            .render('error/notFound', {
            message: `router for [${req.originalUrl}] not found.`,
            layout: 'layouts/error'
        });
    }
    catch (error) {
        next(error);
    }
}
exports.notFoundHandler = notFoundHandler;
