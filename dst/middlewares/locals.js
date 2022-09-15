"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locals = void 0;
function locals(req, res, next) {
    res.locals.req = req;
    next();
}
exports.locals = locals;
