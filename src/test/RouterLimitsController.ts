import AsyncLock from 'async-lock';
import 'mocha';
import {assert} from "chai";
import {RouterLimitsWebhookController} from "../controllers/RouterLimitsWebhookController";
import {MockBillingModel} from "../models/BillingModel";
import {MockAccountsModel} from "../models/AccountsModel";
import {PlansModel} from "../models/PlansModel";
import {MockRouterLimitsModel} from "../models/RouterLimitsModel";

describe("RouterLimitsWebhookController", () => {
    describe("Unit tests", () => {
        const planId = "rlp1";
        const billingPlanId = "bp1";
        const fakePlans = [{id : planId, billingId: billingPlanId, name: "Cat's Pajamas", default: true}];

        const accountId = "czxslkmdsac";
        const testFirstName = "Test";
        const testLastname = "Customer";
        const testEmail = "test@example.org";

        let billing : MockBillingModel;
        let accounts : MockAccountsModel;
        let rl : MockRouterLimitsModel;
        let plans : PlansModel;
        let rlc : RouterLimitsWebhookController;

        beforeEach(() => {
            billing = new MockBillingModel();
            accounts = new MockAccountsModel();
            rl = new MockRouterLimitsModel();
            plans = new PlansModel(fakePlans);

            rlc = new RouterLimitsWebhookController(billing, accounts, plans, rl, new AsyncLock());
        });

        describe("handleAccountCreated", () => {

            it("Works and handles duplicates correctly", () => {
                return rlc.handleAccountCreated(makeTimestamp(), accountId, testFirstName, testLastname, testEmail).then(() => {
                    assert.equal(accounts.accounts.size, 1);
                    assert(accounts.accounts.has(accountId));
                    return rlc.handleAccountCreated(makeTimestamp(), accountId, testFirstName, testLastname, testEmail);
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
                return billing.createCustomer(testFirstName, testLastname, testEmail).then((billingCustomerId) => {
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
                return billing.createCustomer(testFirstName, testLastname, testEmail).then((billingCustomerId) => {
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

        describe("handleAccountMoveIn", () => {
            it("Works with no moveInDefault", async () => {
                const accountId = await rl.createAccount("asdf123");
                await rlc.handleAccountMoveIn(makeTimestamp(), accountId, testFirstName, testLastname, testEmail);
            });

            it("Works with moveInDefault", async () => {
                plans = new PlansModel([{id : planId, billingId: billingPlanId, name: "Cat's Pajamas", default: true, moveInDefault: true}]);
                rlc = new RouterLimitsWebhookController(billing, accounts, plans, rl, new AsyncLock());

                const accountId = await rl.createAccount("asdf123");
                await rlc.handleAccountMoveIn(makeTimestamp(), accountId, testFirstName, testLastname, testEmail);
            });
        });

        describe("handleAccountMoveOut", () => {
            it("Works", async () => {

                const billingId = await billing.createCustomer(testFirstName, testLastname, testEmail);
                const rlId = await rl.createAccount("whatever");
                const account = await accounts.create(rlId, billingId);

                await rlc.handleAccountMoveOut(makeTimestamp(), account.id);

                let itFailed = false;
                try {
                    await billing.get(billingId)
                }
                catch(e) {
                    itFailed = true;
                }

                if (!itFailed) {
                    throw new Error("Expected billing to be gone");
                }

                if (await accounts.get(account.id)) {
                    throw new Error("Expected account to be gone");
                }
            });
        });
    });
});

const makeTimestamp = () => {
    return + new Date () / 1000 | 0;
};
