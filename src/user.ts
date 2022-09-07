import { auth } from '@cinerino/sdk';
import * as createDebug from 'debug';

const debug = createDebug('chevre-backend:user');

/**
 * ユーザー設定インターフェース
 */
export interface IConfigurations {
    host: string;
    session: Express.Session;
}
export interface IProfile {
    sub: string;
    iss: string;
    'cognito:groups'?: string[];
    'cognito:username'?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
}

// export interface ICognitoGroups {
//     movieTheaters?: any[]; // chevreapi.factory.place.movieTheater.IPlaceWithoutScreeningRoom[]
// }

/**
 * リクエストユーザー
 */
export class User {
    public host: string;
    public session: Express.Session;
    public state: string;
    /**
     * ChevreAPI認証クライアント(管理者としてのAuthorizationCodeフロー)
     */
    public authClient: auth.OAuth2;
    public profile: IProfile;
    // public cognitoGroups: ICognitoGroups;

    constructor(configurations: IConfigurations) {
        this.host = configurations.host;
        this.session = configurations.session;
        this.authClient = new auth.OAuth2({
            domain: <string>process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: <string>process.env.API_CLIENT_ID,
            clientSecret: <string>process.env.API_CLIENT_SECRET,
            redirectUri: `https://${configurations.host}/signIn`,
            logoutUri: `https://${configurations.host}/logout`
        });
        this.authClient.setCredentials({ refresh_token: this.getRefreshToken() });
    }
    public generateAuthUrl() {
        return this.authClient.generateAuthUrl({
            scopes: [],
            state: this.state,
            codeVerifier: <string>process.env.API_CODE_VERIFIER
        });
    }
    public generateLogoutUrl() {
        return this.authClient.generateLogoutUrl();
    }
    public getRefreshToken(): string | undefined {
        return this.session.refreshToken;
    }
    public isAuthenticated(): boolean {
        return typeof this.getRefreshToken() === 'string';
    }
    public async signIn(code: string) {
        // 認証情報を取得できればログイン成功
        const credentials = await this.authClient.getToken(code, <string>process.env.API_CODE_VERIFIER);
        debug('credentials published', credentials);

        if (credentials.access_token === undefined) {
            throw new Error('Access token is required for credentials.');
        }

        if (credentials.refresh_token === undefined) {
            throw new Error('Refresh token is required for credentials.');
        }

        // リフレッシュトークンを保管
        this.session.refreshToken = credentials.refresh_token;

        return this;
    }
    public logout() {
        delete this.session.refreshToken;
    }
    public async retrieveProfile() {
        await this.authClient.refreshAccessToken();
        const payload = this.authClient.verifyIdToken({}).payload;
        if (payload !== undefined) {
            this.profile = payload;
        }

        // if (this.cognitoGroups === undefined) {
        //     this.cognitoGroups = {};
        // }

        // if (this.profile['cognito:groups'] !== undefined
        //     && this.profile['cognito:groups'].length > 0
        //     && this.cognitoGroups.movieTheaters === undefined) {
        //     this.cognitoGroups.movieTheaters = [];
        // }
        // debug('profile', this.profile);
        // debug('cognitoGroups', this.cognitoGroups);

        return this;
    }
}
