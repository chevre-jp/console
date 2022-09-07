"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creativeWorksRouter = void 0;
const express_1 = require("express");
const http_status_1 = require("http-status");
const movie_1 = require("./creativeWork/movie");
const creativeWorksRouter = (0, express_1.Router)();
exports.creativeWorksRouter = creativeWorksRouter;
creativeWorksRouter.get('/\\$thumbnailUrlStr\\$', (__, res) => {
    res.status(http_status_1.NO_CONTENT)
        .end();
});
creativeWorksRouter.use('/movie', movie_1.movieRouter);
