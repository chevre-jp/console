import { Router } from 'express';
import { NO_CONTENT } from 'http-status';

import movieRouter from './creativeWork/movie';

const creativeWorksRouter = Router();

creativeWorksRouter.get(
    '/\\$thumbnailUrlStr\\$',
    (__, res) => {
        res.status(NO_CONTENT)
            .end();
    }
);

creativeWorksRouter.use('/movie', movieRouter);

export default creativeWorksRouter;
