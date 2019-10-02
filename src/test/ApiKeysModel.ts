import 'mocha';
process.env["NODE_CONFIG_ENV"] = "test";
import config from "config";
import {IApiKeysModel, MySQLApiKeysModel, SQLiteApiKeysModel} from "../models/ApiKeysModel";
import {Configuration} from "Configuration";
import mysql from "mysql";
import crypto from "crypto";

describe("SQLiteApiKeysModel", () => {
    let keys : IApiKeysModel;
    beforeEach(async () => {
        keys = await SQLiteApiKeysModel.createInstance(":memory:", 10);
    });

    it("Returns undefined if no key", async () => {
        const accountId = await keys.getAccountIdByKey("asdf");
        if (accountId !== undefined) {
            throw new Error("Expected key to be undefined");
        }
    });

    it("Can set and return", async () => {
        const expectedAccountId = "accountId";
        const key = await keys.generate(expectedAccountId);
        const accountId = await keys.getAccountIdByKey(key);
        if (accountId !== expectedAccountId) {
            throw new Error(`Expected ${expectedAccountId}`);
        }
    });

    it("Expired keys not honored", async () => {
        const expectedAccountId = "accountId";
        const key = await keys.generate(expectedAccountId);
        await keys.markExpired(key);
        const accountId = await keys.getAccountIdByKey(key);
        if (accountId !== undefined) {
            throw new Error(`Expected key to have expired`);
        }
    });
});

describe("MySQLApiKeysModel", () => {
    const c : Configuration = config.util.toObject();
    let pool : mysql.Pool;
    before(function() {
        // Skip if we aren't running a test config
        if (!c.isTest) {
            this.skip();
        }

        // Skip if test config doesn't have MySQL configured
        if (!c.mysql) {
            this.skip();
        }
        // Skip if mysql database doesn't have 'test' as a substring
        else if (!c.mysql.database.toLowerCase().includes("test")) {
            this.skip();
        }
        else {
            pool = mysql.createPool(c.mysql);
        }
    });

    // Close the pool after we're done running tests, or it will keep mocha running
    after(async () => {
        if (pool) {
            return new Promise((resolve, reject) => {
                pool.end((err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                })
            })
        }
    });

    it("Returns undefined if no key", async () => {
        const keys = new MySQLApiKeysModel(pool, 10);

        const key = crypto.randomBytes(10).toString('hex');

        const accountId = await keys.getAccountIdByKey(key);
        if (accountId !== undefined) {
            throw new Error("Expected key to be undefined");
        }
    });

    it("Can set and return", async () => {
        const keys = new MySQLApiKeysModel(pool, 10);

        const expectedAccountId = crypto.randomBytes(10).toString('hex');
        const key = await keys.generate(expectedAccountId);
        const accountId = await keys.getAccountIdByKey(key);
        if (accountId !== expectedAccountId) {
            throw new Error(`Expected ${expectedAccountId}`);
        }
    });

    it("Expired keys not honored", async () => {
        const keys = new MySQLApiKeysModel(pool, 10);

        const expectedAccountId = crypto.randomBytes(10).toString('hex');
        const key = await keys.generate(expectedAccountId);
        await keys.markExpired(key);
        const accountId = await keys.getAccountIdByKey(key);
        if (accountId !== undefined) {
            throw new Error(`Expected key to have expired`);
        }
    });
});
