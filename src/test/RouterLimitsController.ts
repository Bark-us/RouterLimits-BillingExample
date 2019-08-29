import 'mocha';
import {assert} from "chai";
import {RouterLimitsController} from "../controllers/RouterLimitsController";
import {MockBillingModel} from "../models/BillingModel";
import {MockAccountsModel} from "../models/AccountsModel";
import {PlansModel} from "../models/PlansModel";

describe("RouterLimitsController", () => {
    describe("Unit tests", () => {
        const planId = "rlp1";
        const billingPlanId = "bp1";
        const fakePlans = [{id : planId, billingId: billingPlanId}];

        const accountId = "czxslkmdsac";

        let billing : MockBillingModel;
        let accounts : MockAccountsModel;
        let plans : PlansModel;
        let rlc : RouterLimitsController;

        beforeEach(() => {
            billing = new MockBillingModel();
            accounts = new MockAccountsModel();
            plans = new PlansModel(fakePlans);

            rlc = new RouterLimitsController(billing, accounts, plans);
        });

        describe("handleAccountCreated", () => {

            it("Works and handles duplicates correctly", () => {
                return rlc.handleAccountCreated(makeTimestamp(), accountId).then(() => {
                    assert.equal(accounts.accounts.size, 1);
                    assert(accounts.accounts.has(accountId));
                    return rlc.handleAccountCreated(makeTimestamp(), accountId);
                }).then(() => {
                    assert.equal(accounts.accounts.size, 1);
                    assert(accounts.accounts.has(accountId));
                    return Promise.resolve();
                })
            });
        });

        describe("handleAccountSubscriptionChange", () => {
            it("Fails if account does not exist", () => {
                return rlc.handleAccountSubscriptionChange(makeTimestamp(), accountId, planId).then(() => {
                    return Promise.reject(new Error("Expected failure"));
                }).catch((err) => {
                    return Promise.resolve();
                })
            });

            it("Fails if plan does not exist", () => {
                return accounts.create(accountId, "whatever").then(() => {
                    return rlc.handleAccountSubscriptionChange(makeTimestamp(), accountId, "fakePlan");
                }).then(() => {
                    return Promise.reject(new Error("Expected failure"));
                }).catch((err) => {
                    return Promise.resolve();
                })
            });

            it("Works", () => {
                let billingId : string;
                return billing.createCustomer().then((billingCustomerId) => {
                    billingId = billingCustomerId;
                    return accounts.create(accountId, billingCustomerId);
                }).then(() => {
                    return rlc.handleAccountSubscriptionChange(makeTimestamp(), accountId, planId);
                }).then(() => {
                    return billing.get(billingId);
                }).then((subscribedBillingPlanId) => {
                    if (subscribedBillingPlanId !== billingPlanId)
                        return Promise.reject(new Error("Wrong plan"));
                    return Promise.resolve();
                })
            })
        });

        describe("handleAccountSubscriptionCancel", () => {
            it("Fails if account does not exist", () => {
                return rlc.handleAccountSubscriptionCancel(makeTimestamp(), accountId).then(() => {
                    return Promise.reject(new Error("Expected failure"));
                }).catch((err) => {
                    return Promise.resolve();
                })
            });

            it("Works", () => {
                let billingId : string;
                return billing.createCustomer().then((billingCustomerId) => {
                    billingId = billingCustomerId;
                    return accounts.create(accountId, billingCustomerId);
                }).then(() => {
                    return billing.subscribe(billingId, billingPlanId);
                }).then(() => {
                    return rlc.handleAccountSubscriptionCancel(makeTimestamp(), accountId);
                }).then(() => {
                    return billing.get(billingId);
                }).then((subscribedBillingPlanId) => {
                    if (subscribedBillingPlanId !== null)
                        return Promise.reject(new Error("Should be unsubscribed"));
                    return Promise.resolve();
                })
            })
        });
    });
});

const makeTimestamp = () => {
    return + new Date () / 1000 | 0;
};