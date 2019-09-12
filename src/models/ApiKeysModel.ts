import * as crypto from 'crypto';
import {ExpireMap} from "../ExpireSet";
import * as sqlite3 from 'sqlite3';

const numBytes = 28;

export interface IApiKeysModel {
    generate(accountId: string): Promise<string>;

    getAccountIdByKey(apiKey: string): Promise<string | undefined>;

    markExpired(apiKey: string) : Promise<void>;
}

export class ApiKeysModel implements IApiKeysModel {
    private readonly keys: ExpireMap<string, string>;

    constructor(ttl: number) {
        this.keys = new ExpireMap<string, string>(ttl);
    }

    generate(accountId: string): Promise<string> {
        const key = crypto.randomBytes(numBytes).toString('hex');

        this.keys.insert(key, accountId);

        return Promise.resolve(key);
    }

    getAccountIdByKey(apiKey: string): Promise<string | undefined> {
        return Promise.resolve(this.keys.get(apiKey));
    }

    async markExpired(apiKey: string): Promise<void> {
        this.keys.remove(apiKey);
    }
}

export class SQLiteApiKeysModel implements IApiKeysModel {
    private readonly db : sqlite3.Database;
    private readonly ttl : number;

    static async createInstance(dbName : string, ttl: number) : Promise<SQLiteApiKeysModel> {
        return new Promise((resolve, reject) => {
            const db : sqlite3.Database = new sqlite3.Database(dbName, (err) => {
                if (err) {
                    return reject(err);
                }

                return resolve(db);
            });
        }).then((db : sqlite3.Database) => {
            return this.initSchema(db).then(() => {
                return Promise.resolve(new SQLiteApiKeysModel(db, ttl));
            });
        })
    }

    private static initSchema(db : sqlite3.Database) : Promise<void> {
        const queries = [
            `CREATE TABLE IF NOT EXISTS \`apiKeys\` (
                \`id\` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                \`apiKey\` TEXT NOT NULL UNIQUE,
                \`accountId\` TEXT NOT NULL,
                \`expiresAt\` INTEGER NOT NULL
            );`
        ].map((q) => {
            return new Promise((resolve, reject) => {
                db.exec(q, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve();
                })
            })
        });

        return Promise.all(queries)
            .then((results) => {
                return Promise.resolve();
            });
    }

    private constructor(db : sqlite3.Database, ttl: number) {
        this.db = db;
        this.ttl = ttl;
    }

    async generate(accountId: string): Promise<string> {
        const key = crypto.randomBytes(numBytes).toString('hex');
        const expiresAt = (+new Date() / 1000 | 0) + this.ttl;

        await new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO apiKeys (apiKey, accountId, expiresAt) VALUES (?, ?, ?);`, key, accountId, expiresAt, (err: Error) => {
                if (err)
                    reject(err);
                else
                    resolve();
            })
        });

        return key;
    }

    async getAccountIdByKey(apiKey: string): Promise<string | undefined> {
        return await new Promise((resolve, reject) => {
            const now = +new Date()/ 1000 | 0;
            this.db.get(`SELECT accountId FROM apiKeys WHERE apiKey = ? AND expiresAt > ?;`, apiKey, now, (err: Error, row: any) => {
                if (err) {
                    return reject(err);
                }

                if (!row || !row.accountId) {
                    return resolve(undefined)
                }
                return resolve(row.accountId);
            })
        })
    }

    async markExpired(apiKey: string): Promise<void> {
        return await new Promise((resolve, reject) => {
            this.db.run(`UPDATE apiKeys SET expiresAt = 0 WHERE apiKey = ?;`, apiKey, (err) => {
                if (err) {
                    return reject(err);
                }
                return resolve();
            })
        })
    }
}
