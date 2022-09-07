"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const sdk_1 = require("@cinerino/sdk");
const createDebug = require("debug");
const debug = createDebug('chevre-backend:user');
// export interface ICognitoGroups {
//     movieTheaters?: any[]; // chevreapi.factory.place.movieTheater.IPlaceWithoutScreeningRoom[]
// }
/**
 * リクエストユーザー
 */
class User {
    // public cognitoGroups: ICognitoGroups;
    constructor(configurations) {
        this.host = configurations.host;
        this.session = configurations.session;
        this.authClient = new sdk_1.auth.OAuth2({
            domain: process.env.API_AUTHORIZE_SERVER_DOMAIN,
            clientId: process.env.API_CLIENT_ID,
            clientSecret: process.env.API_CLIENT_SECRET,
            redirectUri: `https://${configurations.host}/signIn`,
            logoutUri: `https://${configurations.host}/logout`
        });
        this.authClient.setCredentials({ refresh_token: this.getRefreshToken() });
    }
    generateAuthUrl() {
        return this.authClient.generateAuthUrl({
            scopes: [],
            state: this.state,
            codeVerifier: process.env.API_CODE_VERIFIER
        });
    }
    generateLogoutUrl() {
        return this.authClient.generateLogoutUrl();
    }
    getRefreshToken() {
        return this.session.refreshToken;
    }
    isAuthenticated() {
        return typeof this.getRefreshToken() === 'string';
    }
    signIn(code) {
        return __awaiter(this, void 0, void 0, function* () {
            // 認証情報を取得できればログイン成功
            const credentials = yield this.authClient.getToken(code, process.env.API_CODE_VERIFIER);
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
        });
    }
    logout() {
        delete this.session.refreshToken;
    }
    retrieveProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.authClient.refreshAccessToken();
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
        });
    }
}
exports.User = User;
