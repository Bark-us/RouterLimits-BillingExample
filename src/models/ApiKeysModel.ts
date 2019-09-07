import * as crypto from 'crypto';
import {ExpireMap} from "../ExpireSet";
import {Account} from "./AccountsModel";

const numBytes = 28;

export interface IApiKeysModel {
    generate(acctInto: Account): Promise<string>;

    getInfoByKey(apiKey: string): Promise<Account | undefined>;
}

export class ApiKeysModel implements IApiKeysModel {
    private readonly keys: ExpireMap<string, Account>;

    constructor(ttl: number) {
        this.keys = new ExpireMap<string, Account>(ttl);
    }

    generate(acctInfo: Account): Promise<string> {
        const key = crypto.randomBytes(numBytes).toString('hex');

        this.keys.insert(key, acctInfo);

        return Promise.resolve(key);
    }

    getInfoByKey(apiKey: string): Promise<Account | undefined> {
        return Promise.resolve(this.keys.get(apiKey));
    }
}
