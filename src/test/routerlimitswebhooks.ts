import {ApiServer} from "../ApiServer";
import AsyncLock from 'async-lock';
import axios from 'axios';
import {assert, expect} from "chai";
import crypto from "crypto";
import 'mocha';
import {
    RLAccountCanceledWebhookData,
    RLAccountCreatedWebhookData,
    RLAccountSubscribedWebhookData,
    Webhook
} from "../routerlimits/webhooks";
import {Configuration} from "../Configuration";
import {IRouterLimitsWebhookController} from "../controllers/RouterLimitsWebhookController";
import {BillingWebhookController, IBillingWebhookController} from "../controllers/BillingWebhookController";
import {IAccountsModel, MockAccountsModel} from "../models/AccountsModel";
import {AuthenticationController, IAuthenticationController} from "../controllers/AuthenticationController";
import {ApiKeysModel, IApiKeysModel} from "../models/ApiKeysModel";
import {AccountsController, IAccountsController} from "../controllers/AccountsController";
import {IBillingModel, MockBillingModel} from "../models/BillingModel";
import {IRouterLimitsModel, MockRouterLimitsModel} from "../models/RouterLimitsModel";
import {PlansController} from "../controllers/PlansController";
import {IPlansModel, PlansModel} from "../models/PlansModel";
import {LogLevel, NullLoggingModel} from "../models/LoggingModel";
import {MockProxyUserController} from "../controllers/ProxyUserController";

const generateTestWebhookObj = () => {
    return {
        attempt: 1,
        attemptTimestamp: + new Date() / 1000 | 0,
        data : {
            accountId : "smarf",
            plan : {
                id : "plan1",
                name : "Plan 9"
            }
        },
        eventId: "chocolate123",
        eventType: "ACCOUNT_SUBSCRIBED",
        eventTimestamp: + new Date() / 1000 | 0
    };
};

class MockRouterLimitsWebhookController implements IRouterLimitsWebhookController {
    numProcessed : number;

    constructor() {
        this.numProcessed = 0;
    }

    async handleAccountCreated(timestamp: number, accountId: string): Promise<void> {
    }

    async handleAccountSubscriptionCancel(timestamp: number, accountId: string): Promise<void> {
    }

    async handleAccountSubscriptionChange(timestamp: number, accountId: string, planId: string): Promise<void> {
    }

    async handleAccountMoveIn(timestamp: number, accountId: string, firstName: string, lastName: string, email: string): Promise<void> {
    }

    async handleAccountMoveOut(timestamp: number, accountId: string): Promise<void> {
    }

}

describe("Router Limits Webhooks", () => {
    describe("Functional tests", () => {
        let api : ApiServer;
        let accounts : IAccountsModel;
        let apiKeys : IApiKeysModel;
        let billing : IBillingModel;
        let rl: IRouterLimitsModel;
        let plans: IPlansModel;

        let billingController : IBillingWebhookController;
        let authController : IAuthenticationController;
        let accountsController : IAccountsController;
        let processor : MockRouterLimitsWebhookController;

        const config : Configuration = {
            api: {listenPort: 0, apiKeyTtl: 1, allowedOrigins: "*"},
            logLevel: LogLevel.DEBUG,
            mysql : {connectionLimit : 10, host : "mysql.example.net", user : "dbuser", password : "dbpass", database : "billingsample"},
            planMap: [{id: "plan9", name: "Out Space", default: true, billingId: "b_plan9"}],
            routerlimits: {apiKey: "", sharedSecret: "secretcats", webhookValidInterval: 1, jwtValidInterval: 1, organiztionId: ""},
            stripe: {publishableKey: "",secretKey: "", webhookSecret:"", webhookValidInterval: 300, apiVersion: "2017-06-05"}
        };

        beforeEach(() => {
            accounts = new MockAccountsModel();
            apiKeys = new ApiKeysModel(config.api.apiKeyTtl);
            billing = new MockBillingModel();
            rl = new MockRouterLimitsModel();
            plans = new PlansModel(config.planMap);
            const lock = new AsyncLock();

            billingController = new BillingWebhookController(accounts, rl, lock);
            authController = new AuthenticationController(config, accounts, apiKeys);
            accountsController = new AccountsController(billing, accounts, apiKeys, rl, plans, lock);
            processor = new MockRouterLimitsWebhookController();
            const plansController = new PlansController(plans);
            const proxyUsersController = new MockProxyUserController();

            api = new ApiServer(config, processor, billingController, authController, accountsController, plansController, proxyUsersController, new NullLoggingModel());
        });

        afterEach(() => {
            if (api) {
                api.close();
            }
        });

        it("Webhooks fail without signature header", () => {
            return axios.request(
                {
                    url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                    method : "post",
                    data: generateTestWebhookObj(),
                    validateStatus : (status) => {return true}
                })
                .then((res) => {
                    if (res.status !== 400)
                        return Promise.reject(new Error("Expected 400 status"));
                    if (res.data !== "Missing signature")
                        return Promise.reject(new Error("Expected 'Missing signature' response"));
                    return Promise.resolve();
                });
        });

        it("Webhooks fail with invalid signature header", () => {
            return axios.request(
                {
                    url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                    method : "post",
                    data: generateTestWebhookObj(),
                    validateStatus : (status) => {return true},
                    headers : {'x-rl-signatures' : 'Oh, hello'}
                })
                .then((res) => {
                    if (res.status !== 400)
                        return Promise.reject(new Error("Expected 400 status"));
                    if (res.data !== "Invalid signature")
                        return Promise.reject(new Error("Expected 'Invalid signature' response"));
                    return Promise.resolve();
                });
        });

        it("Webhooks fail with invalid JSON", () => {
            const data = "This isn't JSON";
            return axios.request(
                {
                    url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                    method : "post",
                    data: data,
                    validateStatus : (status) => {return true},
                    headers : {'x-rl-signatures' : crypto.createHmac("sha256", config.routerlimits.sharedSecret).update(data).digest().toString('hex')}
                })
                .then((res) => {
                    if (res.status !== 400)
                        return Promise.reject(new Error("Expected 400 status"));
                    if (res.data !== "Invalid JSON")
                        return Promise.reject(new Error("Expected 'Invalid JSON' response"));
                    return Promise.resolve();
                });
        });

        it("Webhooks fail with invalid webhook object", () => {
            const data = JSON.stringify({rose: "bud"});
            return axios.request(
                {
                    url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                    method : "post",
                    data: data,
                    validateStatus : (status) => {return true},
                    headers : {'x-rl-signatures' : crypto.createHmac("sha256", config.routerlimits.sharedSecret).update(data).digest().toString('hex')}
                })
                .then((res) => {
                    if (res.status !== 400)
                        return Promise.reject(new Error("Expected 400 status"));
                    if (res.data !== "Invalid webhook format")
                        return Promise.reject(new Error("Expected 'Invalid webhook format' response"));
                    return Promise.resolve();
                });
        });

        it("Webhooks fail with invalid (out-of-range) attemptTimestamp", () => {
            const dataObj = generateTestWebhookObj();
            dataObj.attemptTimestamp = 0;

            const data = JSON.stringify(dataObj);

            return axios.request(
                {
                    url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                    method : "post",
                    data: data,
                    validateStatus : (status) => {return true},
                    headers : {'x-rl-signatures' : crypto.createHmac("sha256", config.routerlimits.sharedSecret).update(data).digest().toString('hex')}
                })
                .then((res) => {
                    if (res.status !== 400)
                        return Promise.reject(new Error("Expected 400 status"));
                    if (res.data !== "Invalid attemptTimestamp")
                        return Promise.reject(new Error("Expected 'Invalid attemptTimestamp' response"));
                    return Promise.resolve();
                });
        });

        it("Webhooks can't be processed twice", () => {
            const dataObj = generateTestWebhookObj();

            const data = JSON.stringify(dataObj);

            return axios.request(
                {
                    url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                    method : "post",
                    data: data,
                    validateStatus : (status) => {return true},
                    headers : {'x-rl-signatures' : crypto.createHmac("sha256", config.routerlimits.sharedSecret).update(data).digest().toString('hex')}
                })
                .then((res) => {
                    if (res.status !== 204)
                        return Promise.reject(new Error("Expected 204 status"));
                    return Promise.resolve();
                })
                .then(() => {
                    return axios.request(
                        {
                            url: `http://127.0.0.1:${api.listenPort}/webhooks/routerlimits`,
                            method : "post",
                            data: data,
                            validateStatus : (status) => {return true},
                            headers : {'x-rl-signatures' : crypto.createHmac("sha256", config.routerlimits.sharedSecret).update(data).digest().toString('hex')}
                        })
                })
                .then((res) => {
                    if (res.status !== 204)
                        return Promise.reject(new Error("Expected 204 status"));

                    if (processor.numProcessed > 1)
                        return Promise.reject(new Error("Webhook was processed twice"));

                    return Promise.resolve();
                });
        });
    });

    describe("Unit Tests", () => {
        describe("Webhook Data Deserialization", () => {
            describe("Account Created", () => {
                it("Good Data", () => {
                    const obj = {id : "Sweet Nuggets", user: {firstName : "Test", lastName: "Customer", email: "example@example.org"}};
                    RLAccountCreatedWebhookData.fromObj(obj);
                });

                it("Empty Obj", () => {
                    expect(() => {
                        const obj = {};
                        RLAccountCreatedWebhookData.fromObj(obj);
                    }).to.throw(Error);
                });

                it("Bogus Obj", () => {
                    expect(() => {
                        const obj = {id: 5};
                        RLAccountCreatedWebhookData.fromObj(obj);
                    }).to.throw(Error);
                });
            });

            describe("Account Subscribed", () => {
                it("Good Data", () => {
                    const obj = {
                        accountId : "Sweet Nuggets",
                        plan : {
                            id : "planId",
                            name : "Cool Plan"
                        }
                    };
                    RLAccountSubscribedWebhookData.fromObj(obj);
                });

                it("Empty Obj", () => {
                    expect(() => {
                        const obj = {};
                        RLAccountSubscribedWebhookData.fromObj(obj);
                    }).to.throw(Error);
                });

                it("Bogus Obj", () => {
                    expect(() => {
                        const obj = {accountId: 5, plan : {id: 6, name : null}};
                        RLAccountSubscribedWebhookData.fromObj(obj);
                    }).to.throw(Error);
                });
            });

            describe("Account Canceled", () => {
                it("Good Data", () => {
                    const obj = {accountId : "Sweet Nuggets"};
                    RLAccountCanceledWebhookData.fromObj(obj);
                });

                it("Empty Obj", () => {
                    expect(() => {
                        const obj = {};
                        RLAccountCanceledWebhookData.fromObj(obj);
                    }).to.throw(Error);
                });

                it("Bogus Obj", () => {
                    expect(() => {
                        const obj = {accountId: 5, plan : {id: 6, name : null}};
                        RLAccountCanceledWebhookData.fromObj(obj);
                    }).to.throw(Error);
                });
            })
        });

        it("Webhook Deserialization", () => {
            const obj = generateTestWebhookObj();
            const w = Webhook.fromObj(obj);

            assert.equal(w.attempt, obj.attempt);
            assert.equal(w.attemptTimestamp, obj.attemptTimestamp);
            assert.equal(w.eventId, obj.eventId);
            assert.equal(w.eventType, obj.eventType);
            assert.equal(w.eventTimestamp, obj.eventTimestamp);
            assert.instanceOf(w.data, RLAccountSubscribedWebhookData);

            const data = w.data as RLAccountSubscribedWebhookData;

            assert.equal(data.accountId, obj.data.accountId);
            assert.equal(data.plan.id, obj.data.plan.id);
            assert.equal(data.plan.name, obj.data.plan.name);
        })
    });
});
