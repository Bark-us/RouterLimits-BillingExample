import {Configuration} from "../Config";
import * as jwt from 'jwt-simple';
import Ajv from 'ajv';
import {Account, IAccountsModel} from "../models/AccountsModel";
import {ExpireSet} from "../ExpireSet";
import {IApiKeysModel} from "../models/ApiKeysModel";

export interface IAuthenticationController {
    handle(token : string) : Promise<AuthResponse>;
    validateApiKey(apiKey: string) : Promise<Account | undefined>;
}

export enum AuthResult {
    INVALID,
    DENIED,
    SUCCESS
}
export type AuthResponse = {result: AuthResult.DENIED | AuthResult.INVALID, message: string} | {result: AuthResult.SUCCESS, body: AuthResponseBody};
export type AuthResponseBody = {apiKey: string, accountId: string};

export class AuthenticationController implements IAuthenticationController {
    private readonly config : Configuration;
    private readonly accounts : IAccountsModel;
    private readonly apikeys : IApiKeysModel;
    private readonly usedIds : ExpireSet<string>;

    constructor(config : Configuration, accounts: IAccountsModel, apiKeys: IApiKeysModel) {
        this.config = config;
        this.accounts = accounts;
        this.apikeys = apiKeys;
        this.usedIds = new ExpireSet<string>(config.routerlimits.webhookValidInterval);
    }

    async handle(token: string) : Promise<AuthResponse> {

        // Decode the token
        let decoded : DecodedJWT;
        try {
            decoded = jwt.decode(token, this.config.routerlimits.sharedSecret, false, 'HS256');
        } catch (e) {
            return {result:AuthResult.INVALID, message: "Invalid token or signature"};
        }

        // Validate token format
        const ajv = new Ajv();
        const valid = ajv.validate(
            {
                type: 'object',
                properties: {
                    aid : {type: 'string', minLength: 1},
                    iat : {type: 'number'},
                    jti : {type: 'string', minLength: 1},
                    oid : {type: 'string', minLength: 1},
                    action: {type: 'string', minLength: 1}
                },
                required: ['aid', 'iat', 'jti', 'oid']
            },
            decoded
        );
        if (!valid) {
            return {result: AuthResult.INVALID, message: "Invalid decoded token format"};
        }

        // Make sure timestamp is valid
        const now = +new Date() / 1000 | 0;
        if (Math.abs(now - decoded.iat) > this.config.routerlimits.jwtValidInterval) {
            return {result: AuthResult.DENIED, message: "Expired token"};
        }

        // Make sure we haven't seen token before
        if (this.usedIds.has(decoded.jti)) {
            return {result: AuthResult.DENIED, message: "Replayed token"};
        }
        this.usedIds.insert(decoded.jti);

        // Do we have a matching account?
        const acct = await this.accounts.get(decoded.aid);
        if (!acct) {
            return {result: AuthResult.DENIED, message: "No such account"};
        }

        // Generate Api key
        const apiKey = await this.apikeys.generate(acct.id);
        return {result: AuthResult.SUCCESS, body: {apiKey: apiKey, accountId: acct.id}};
    }

    async validateApiKey(apiKey: string): Promise<Account | undefined> {
        const accountId = await this.apikeys.getAccountIdByKey(apiKey);
        if (!accountId)
            return undefined;

        return await this.accounts.get(accountId);
    }
}

type DecodedJWT = {aid: string, iat: number, jti: string, oid: string, action?: string};
