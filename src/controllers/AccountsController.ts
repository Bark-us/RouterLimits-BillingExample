import Ajv from 'ajv';
import AsyncLock from 'async-lock';
import {JsonRequestHandler} from "../http/JsonReceiver";
import {IBillingModel} from "../models/BillingModel";
import {Account, IAccountsModel} from "../models/AccountsModel";
import {IApiKeysModel} from "../models/ApiKeysModel";
import {IRouterLimitsModel} from "../models/RouterLimitsModel";
import {LockNames} from "../Constants";
import {IPlansModel} from "../models/PlansModel";

export interface IAccountsController {
    accountCreation : JsonRequestHandler;
    accountGet : JsonRequestHandler;
    accountUpdate : JsonRequestHandler;
    accountPaymentMethodsList : JsonRequestHandler;
    accountPaymentMethodCreation : JsonRequestHandler;
    accountPaymentMethodDelete : JsonRequestHandler;
    accountPaymentMethodSetDefault : JsonRequestHandler;
}

export class AccountsController implements IAccountsController {
    private readonly billing : IBillingModel;
    private readonly accounts: IAccountsModel;
    private readonly apiKeys: IApiKeysModel;
    private readonly rl: IRouterLimitsModel;
    private readonly plans: IPlansModel;
    private readonly lock: AsyncLock;

    constructor(billing: IBillingModel, accounts: IAccountsModel, apiKeys: IApiKeysModel, rl: IRouterLimitsModel, plans: IPlansModel, lock: AsyncLock) {
        this.billing = billing;
        this.accounts = accounts;
        this.apiKeys = apiKeys;
        this.rl = rl;
        this.plans = plans;
        this.lock = lock;
    }

    accountCreation: JsonRequestHandler = (pathParams, queryParams, body) => {
        // Make sure we have the params we expect (routerPairingCode is optional)
        if (!body.userId) {
            return Promise.resolve({status:400});
        }

        const request = body as AccountCreateRequest;

        // Locking to prevent race condition with webhook posted from Router Limits
        return this.lock.acquire(LockNames.WebhookFreeze, async () => {
            // Create the account in Router Limits
            const accountId = await this.rl.createAccount(request.userId, request.routerPairingCode);
            const rlAccount = await this.rl.getAccount(accountId);

            if (!rlAccount.user) {
                throw new Error("Failed RL account lookup");
            }

            // Create customer in billing system
            const billingId = await this.billing.createCustomer(rlAccount.user.firstName, rlAccount.user.lastName, rlAccount.user.email);

            // Create account mapping
            const acctMapping = await this.accounts.create(accountId, billingId);

            // Create API key for new account
            const apiKey = await this.apiKeys.generate(acctMapping);

            const accountCreateResponse = {
                account: {
                    id: accountId,
                    active: false
                },
                apiKey: apiKey
            };

            return {status: 201, body: accountCreateResponse};
        });
    };

    accountGet: JsonRequestHandler = async (pathParams, queryParams, body, authLocals) => {
        if (!authLocals || !authLocals.account || authLocals.account.id !== pathParams.accountId) {
            return {status: 403};
        }

        // Get billing id of plan
        const billingPlanId = await this.billing.get(authLocals.account.billingId);

        // If no billing plan id set for the user, user is not subscribed
        if (!billingPlanId) {
            return {status: 200, body: {id: authLocals.account.id, active: false}}
        }

        // Get more information about the plan
        const plan = await this.plans.getByBillingId(billingPlanId);
        if (!plan) {
            throw new Error("Failed to find plan");
        }

        return {status:200, body: {id: authLocals.account.id, active: true, plan: {id: plan.id, name: plan.name}}};
    };

    accountPaymentMethodCreation: JsonRequestHandler = async (pathParams, queryParams, body, authLocals) => {
        return {status: 501};
    };

    accountPaymentMethodDelete: JsonRequestHandler = async (pathParams, queryParams, body, authLocals) => {
        if (!pathParams.accountId || !pathParams.methodId) {
            return {status: 400, body: "Bad request"};
        }

        if (!authLocals || !authLocals.account || authLocals.account.id !== pathParams.accountId) {
            return {status: 403};
        }
        const accountInfo = authLocals.account as Account;
        await this.billing.deletePaymentMethod(accountInfo.billingId, pathParams.methodId);
        return {status: 204};
    };

    accountPaymentMethodSetDefault: JsonRequestHandler = async (pathParams, queryParams, body, authLocals) => {
        if (!pathParams.accountId || !pathParams.methodId) {
            return {status: 400, body: "Bad request"};
        }

        if (!authLocals || !authLocals.account || authLocals.account.id !== pathParams.accountId) {
            return {status: 403};
        }
        const accountInfo = authLocals.account as Account;

        await this.billing.setDefaultPaymentMethod(accountInfo.billingId, pathParams.methodId)
        return {status:204};
    };

    accountPaymentMethodsList: JsonRequestHandler = async (pathParams, queryParams, body, authLocals) => {
        if (!authLocals || !authLocals.account || authLocals.account.id !== pathParams.accountId) {
            return {status: 403};
        }
        const accountInfo = authLocals.account as Account;

        // TODO implement pagination as specified in api docs
        const methods = await this.billing.getPaymentMethods(accountInfo.billingId);
        return {
            status:200,
            body: {
                hasMore: false,
                lastEvaluatedKey: methods.length ? methods[methods.length - 1].id : undefined,
                data : methods
        }};
    };

    accountUpdate: JsonRequestHandler = async (pathParams, queryParams, body, authLocals) => {
        if (!authLocals || !authLocals.account || authLocals.account.id !== pathParams.accountId) {
            return {status: 403};
        }
        const accountInfo = authLocals.account as Account;

        // Validate request
        const ajv = new Ajv();
        const valid = ajv.validate(
            {
                type: "object",
                oneOf: [
                    {
                        properties: {
                            active: {enum: [false]}
                        },
                        required: ['active'],
                        additionalProperties: false
                    },
                    {
                        properties: {
                            active: {enum: [true]},
                            planId: {type: 'string', minLength: 1}
                        },
                        additionalProperties: false
                    }
                ]
            },
            body
        );
        if (!valid) {
            return {status: 400, body: "Invalid body"};
        }

        const req : AccountUpdateRequest = body as AccountUpdateRequest;

        // Cancel in our billing system and in Router Limits.
        if (req.active === false) {
            return this.lock.acquire(LockNames.WebhookFreeze, async() => {
                await this.billing.cancel(accountInfo.billingId);
                await this.rl.cancel(accountInfo.id);
                return {status:204};
            })
        }
        // Subscribe to specific plan
        else if (req.planId) {
            // Learn the billing id of the plan
            const planInfo = await this.plans.get(req.planId);
            if (!planInfo) {
                throw new Error("Failed to find plan");
            }

            return this.lock.acquire(LockNames.WebhookFreeze, async () => {
                // Subscribe in billing system first - it may fail due to no payment method, etc. But at this point we have
                // not done anything with RL API, so it's OK
                // TODO gracefully handle insufficient funds / no payment method, if desired
                await this.billing.subscribe(accountInfo.billingId, planInfo.billingId);

                // Now we can make the same change in RL API
                await this.rl.subscribe(accountInfo.id, <string>req.planId);

                return {status: 204};
            })
        }
        else if (req.active === true) {
            // TODO if default plan will require payment, may want to check for payment method availability first

            // Activate the account in RL without specifying a plan. RL will subscribe the account to the default plan
            // and call us with a webhook if there is a change
            await this.rl.activate(accountInfo.id);
            return {status: 204};
        }
        else {
            // Nothing to do. You're welcome
            return {status: 204};
        }
    };
}

type AccountCreateRequest = {userId: string, routerPairingCode?: string};
type AccountUpdateRequest = {active?: boolean, planId?: string};
