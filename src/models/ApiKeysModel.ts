import * as crypto from 'crypto';
import {ExpireMap} from "../ExpireSet";
import {Account} from "./AccountsModel";

const numBytes = 28;

export class ApiKeysModel {
    private readonly keys: ExpireMap<string, Account>;

    constructor(ttl: number) {
        this.keys = new ExpireMap<string, Account>(ttl);
    }

    generate(acctInfo: Account): string {
        const key = crypto.randomBytes(numBytes).toString('hex');

        this.keys.insert(key, acctInfo);

        return key;
    }

    getInfoByKey(apiKey: string): Account | undefined {
        return this.keys.get(apiKey);
    }
}
