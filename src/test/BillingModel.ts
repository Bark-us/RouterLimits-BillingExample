import 'mocha';
process.env["NODE_CONFIG_ENV"] = "test";
import config from "config";
import {Configuration} from "Config";
import {StripeBillingModel} from "../models/BillingModel";

describe("StripeBillingModel", () => {
    const c : Configuration = config.util.toObject();
    let testPlanId : string;
    let testPlanId2 : string;

    before(function() {
        if (!c.stripe.secretKey || c.stripe.secretKey.length <= 0 || c.stripe.secretKey.includes("live")) {
            this.skip();
            return Promise.resolve();
        }

        const temp = new StripeBillingModel(c);

        return Promise.all([
            temp.createPlan(),
            temp.createPlan()
        ]).then((results) => {
            testPlanId = results[0];
            testPlanId2 = results[1];
            c.planMap.push({id : "test", billingId: testPlanId});
            c.planMap.push({id : "test2", billingId: testPlanId2});

            return Promise.resolve();
        })
    });

    it("Works", () => {
        const b = new StripeBillingModel(c);
        let customerId : string;
        return b.createCustomer().then((cid) => {
            customerId = cid;
            return b.subscribe(customerId, testPlanId)
        }).then(() => {
            return b.get(customerId);
        }).then((subscribedPlanId) => {
            if (subscribedPlanId !== testPlanId) {
                return Promise.reject(new Error("They should be subscribed"));
            }
            return Promise.resolve();
        }).then(() => {
            return b.subscribe(customerId, testPlanId2);
        }).then(() => {
            return b.get(customerId);
        }).then((subscribedPlanId) => {
            if (subscribedPlanId !== testPlanId2) {
                return Promise.reject(new Error("They should be subscribed to other plan"));
            }
            return Promise.resolve();
        }).then(() => {
            return b.subscribe(customerId, testPlanId2);
        }).then(() => {
            return b.cancel(customerId);
        }).then(() => {
            return b.get(customerId);
        }).then((subscribedPlanId) => {
            if (subscribedPlanId !== null) {
                return Promise.reject("Expected null plan");
            }
            return Promise.resolve();
        });
    }).timeout(10000)
});
