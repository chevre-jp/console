/**
 * アプリケーション特有の型
 */
import { chevre } from '@cinerino/sdk';

import User from '../user';

declare global {
    namespace Express {
        // tslint:disable-next-line:interface-name
        export interface Request {
            user: User;
            project: { id: string; typeOf: chevre.factory.organizationType.Project };
        }
    }
}
