import 'mocha';
import {IApiKeysModel, SQLiteApiKeysModel} from "../models/ApiKeysModel";

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
