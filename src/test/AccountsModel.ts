import 'mocha';
import {SQLiteAccountsModel} from "../models/AccountsModel";

describe("SQLiteAccountsModel", () => {
    let db : SQLiteAccountsModel;

    before(() => {
        return SQLiteAccountsModel.createInstance(":memory:").then((instance) => {
            db = instance;
            return Promise.resolve();
        });
    });

    it("Can insert and retrieve account info", () => {
        const rlId = "a";
        const billingId = "1";
        return db.create(rlId, billingId).then(() => {
            return db.get(rlId)
        }).then((acct) => {
            if (!acct || acct.billingId != billingId)
                return Promise.reject(new Error("Wrong"));

            return db.getByBillingId(billingId);
        }).then((acct) => {
            if (!acct || acct.id != rlId)
                return Promise.reject(new Error("Wrong"));

            return Promise.resolve();
        })
    })
});
