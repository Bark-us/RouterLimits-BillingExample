import {JsonRequestHandler, JsonType} from "../http/JsonReceiver";
import {Configuration} from "../Config";
import * as jwt from 'jwt-simple';
import Ajv from 'ajv';
import {IAccountsModel} from "../models/AccountsModel";
import {ExpireSet} from "../ExpireSet";
import {ApiKeysModel} from "../models/ApiKeysModel";

export interface IAuthenticationController {
    handle : JsonRequestHandler;
}

export class AuthenticationController implements IAuthenticationController {
    private readonly config : Configuration;
    private readonly accounts : IAccountsModel;
    private readonly apikeys : ApiKeysModel;
    private readonly usedIds : ExpireSet<string>;

    constructor(config : Configuration, accounts: IAccountsModel, apiKeys: ApiKeysModel) {
        this.config = config;
        this.accounts = accounts;
        this.apikeys = apiKeys;
        this.usedIds = new ExpireSet<string>(config.routerlimits.webhookValidInterval);
    }

    public readonly handle : JsonRequestHandler = (pathParams, queryParams, body) => {
        if (!body.jwt) {
            return Promise.resolve({status: 400});
        }

        let decoded : DecodedJWT;
        try {
            decoded = jwt.decode(body.jwt, this.config.routerlimits.sharedSecret, false, 'HS256');
        } catch (e) {
            return Promise.resolve({status: 400, body: "Invalid token or signature"});
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
            return Promise.resolve({status: 400, body: "Invalid decoded token format"});
        }

        // Make sure timestamp is valid
        const now = +new Date() / 1000 | 0;
        if (Math.abs(now - decoded.iat) > this.config.routerlimits.jwtValidInterval) {
            return Promise.resolve({status: 401, body: "Expired token"});
        }

        // Make sure we haven't seen token before
        if (this.usedIds.has(decoded.jti)) {
            return Promise.resolve({status: 401, body: "Replayed token"});
        }
        this.usedIds.insert(decoded.jti);

        // Do we have a matching account?
        return this.accounts.get(decoded.aid).then((acct): Promise<{body? : JsonType, status? : number, headers? : object}> => {
            if (!acct) {
                return Promise.resolve({status: 401, body: "No such account"});
            }

            // Generate API key
            const apiKey = this.apikeys.generate(acct.id);

            return Promise.resolve({status: 200, body: {apiKey: apiKey, accountId: acct.id}});
        })
    }
}

type DecodedJWT = {aid: string, iat: number, jti: string, oid: string, action?: string};
