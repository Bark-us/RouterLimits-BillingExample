import * as crypto from 'crypto';
import {ExpireMap} from "../ExpireSet";

const numBytes = 28;

export class ApiKeysModel {
    private readonly keys: ExpireMap<string, string>;

    constructor(ttl: number) {
        this.keys = new ExpireMap<string, string>(ttl);
    }

    generate(rlAccountId: string): string {
        const key = crypto.randomBytes(numBytes).toString('hex');

        this.keys.insert(key, rlAccountId);

        return key;
    }

    getRlAccountId(apiKey: string): string | undefined {
        return this.keys.get(apiKey);
    }
}
