import * as sqlite3 from 'sqlite3';

export interface IAccountsModel {

    /**
     * Get an account by its Router Limits id
     * @param id
     */
    get(id : string) : Promise<Account | undefined>;

    getByBillingId(billingId : string) : Promise<Account | undefined>;

    /**
     * Create a mapping between a Router Limits id and a billing system id
     * @param id
     * @param billingId
     */
    create(id : string, billingId: string) : Promise<void>;
}

export interface Account {
    /**
     * Router Limits account id
     */
    id : string;

    /**
     * Billing system id
     */
    billingId : string;
}

export class MockAccountsModel implements IAccountsModel {
    public readonly accounts : Map<string, Account>;
    public readonly accountsReverse : Map<string, Account>;

    constructor() {
        this.accounts = new Map();
        this.accountsReverse = new Map();
    }

    create(id: string, billingId: string): Promise<void> {
        const a = this.accounts.get(id);
        if (a) {
            if (a.billingId === billingId) {
                return Promise.resolve();
            }
            return Promise.reject(new Error("Already created"));
        }

        const obj = {id : id, billingId: billingId};
        this.accounts.set(id, obj);
        this.accountsReverse.set(billingId, obj);
        return Promise.resolve();
    }

    get(id: string): Promise<Account | undefined> {
        const a = this.accounts.get(id);
        return Promise.resolve(a);
    }

    getByBillingId(billingId : string) : Promise<Account | undefined> {
        const a = this.accountsReverse.get(billingId);
        return Promise.resolve(a);
    }
}

export class SQLiteAccountsModel implements IAccountsModel {

    private readonly db : sqlite3.Database;

    static createInstance(dbName : string) : Promise<SQLiteAccountsModel> {
        return new Promise((resolve, reject) => {
            const db : sqlite3.Database = new sqlite3.Database(dbName, (err) => {
                if (err) {
                    return reject(err);
                }

                return resolve(db);
            });
        }).then((db : sqlite3.Database) => {
            return this.initSchema(db).then(() => {
                return Promise.resolve(new SQLiteAccountsModel(db));
            });
        })
    }

    private static initSchema(db : sqlite3.Database) : Promise<void> {
        const queries = [
            `CREATE TABLE \`accounts\` (
                \`id\`INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                \`rlId\`TEXT NOT NULL UNIQUE,
                \`billingId\`TEXT NOT NULL UNIQUE
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

    private constructor(db : sqlite3.Database) {
        this.db = db;
    }

    create(id: string, billingId: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO `accounts` (`rlId`, `billingId`) VALUES (?, ?);', id, billingId, (err: Error) => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            })
        })
    }

    get(id: string): Promise<Account | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT `billingId` FROM `accounts` WHERE `rlId` = ?', id, (err, row) => {
                if (err) {
                    return reject(err);
                }

                if (!row || !row.billingId) {
                    return resolve(undefined);
                }

                return resolve({id : id, billingId : row.billingId});
            })
        })
    }

    getByBillingId(billingId: string): Promise<Account | undefined> {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT `rlId` FROM `accounts` WHERE `billingId` = ?', billingId, (err, row) => {
                if (err) {
                    return reject(err);
                }

                if (!row || !row.rlId) {
                    return resolve(undefined);
                }

                return resolve({id : row.rlId, billingId : billingId});
            })
        })
    }

}
