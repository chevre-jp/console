"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_status_1 = require("http-status");
const movie_1 = require("./creativeWork/movie");
const creativeWorksRouter = express_1.Router();
creativeWorksRouter.get('/\\$thumbnailUrlStr\\$', (__, res) => {
    res.status(http_status_1.NO_CONTENT)
        .end();
});
creativeWorksRouter.use('/movie', movie_1.default);
exports.default = creativeWorksRouter;
