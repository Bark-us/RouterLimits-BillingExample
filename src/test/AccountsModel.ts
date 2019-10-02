import 'mocha';
process.env["NODE_CONFIG_ENV"] = "test";
import config from "config";
import {IAccountsModel, MySQLAccountsModel, SQLiteAccountsModel} from "../models/AccountsModel";
import {Configuration} from "../Configuration";
import mysql from "mysql";
import crypto from "crypto";

describe("SQLiteAccountsModel", () => {
    let db : SQLiteAccountsModel;

    before(() => {
        return SQLiteAccountsModel.createInstance(":memory:").then((instance) => {
            db = instance;
            return Promise.resolve();
        });
    });

    it("Can insert and retrieve account info", async () => {
        await commonTest(db);
    })
});

describe("MySQLAccountsModel", () => {
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

    it("Can insert and retrieve account info", async () => {
        const db = new MySQLAccountsModel(pool);
        await commonTest(db);
    })
});

const commonTest = async (db : IAccountsModel) => {
    const rlId = crypto.randomBytes(10).toString('hex');
    const billingId = crypto.randomBytes(10).toString('hex');
    await db.create(rlId, billingId);

    const acct = await db.get(rlId);
    if (!acct || acct.billingId !== billingId) {
        throw new Error("Wrong billingId");
    }

    const acct2 = await db.getByBillingId(billingId);
    if (!acct2 || acct2.id !== acct.id || acct2.billingId !== acct.billingId) {
        throw new Error("Wrong getByBillingId");
    }
};
