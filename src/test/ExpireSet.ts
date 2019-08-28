import {assert} from "chai";
import {ExpireSet} from "../ExpireSet";
import 'mocha';

describe("ExpireSet", () => {
    it("Handles expiration properly", () => {
        const e = new ExpireSet<string>(5);
        const keyName = "a";
        const keyName2 = "b";

        e.insert(keyName);
        assert(e.has(keyName));

        return promiseTimer(3000)
            .then(() => {
                e.insert(keyName2);
            }).then(() => {
                return promiseTimer(3000);
            }).then(() => {
                assert(!e.has(keyName));
                assert(e.has(keyName2));
                return Promise.resolve();
            });
    }).timeout(7000);
});

const promiseTimer = (timeout : number) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    })
};
