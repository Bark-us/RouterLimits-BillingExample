import AsyncLock from 'async-lock';
import {JsonRequestHandler} from "../http/JsonReceiver";
import {IBillingModel} from "../models/BillingModel";
import {Account, IAccountsModel} from "../models/AccountsModel";
import {IApiKeysModel} from "../models/ApiKeysModel";
import {IRouterLimitsModel} from "../models/RouterLimitsModel";
import {LockNames} from "../Constants";
import {IPlansModel} from "../models/PlansModel";
import {
    AccountCreateRequest,
    AccountCreateResponse,
    AccountUpdateRequest,
    ApiAccount,
    PaymentMethod,
    PaymentMethodCreateRequest
} from "../http/HttpTypes";

export interface IAccountsController {
    accountCreation(req : AccountCreateRequest) : Promise<AccountCreateResponse>;
    accountGet(account : Account) : Promise<ApiAccount>;
    accountUpdate(accountInfo: Account, req : AccountUpdateRequest) : Promise<void>;
    accountPaymentMethodsList(accountInfo: Account) : Promise<PaymentMethod[]>;
    accountPaymentMethodCreation(accountInfo: Account, req : PaymentMethodCreateRequest) : Promise<PaymentMethod>;
    // accountPaymentMethodCreation : JsonRequestHandler;
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

    accountCreation(req: AccountCreateRequest): Promise<AccountCreateResponse> {
        // Locking to prevent race condition with webhook posted from Router Limits
        return this.lock.acquire(LockNames.WebhookFreeze, async () => {
            // Create the account in Router Limits
            const accountId = await this.rl.createAccount(req.userId, req.routerPairingCode);
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

            return {
                account: {
                    id: accountId,
                    active: false
                },
                apiKey: apiKey
            };
        })
    }

    async accountGet(account: Account) : Promise<ApiAccount> {
        // Get billing id of plan
        const billingPlanId = await this.billing.get(account.billingId);

        // If no billing plan id set for the user, user is not subscribed
        if (!billingPlanId) {
            return {id: account.id, active: false}
        }

        // Get more information about the plan
        const plan = await this.plans.getByBillingId(billingPlanId);
        if (!plan) {
            throw new Error("Failed to find plan");
        }

        return {id: account.id, active: true, plan: {id: plan.id, name: plan.name}};
    }

    async accountPaymentMethodCreation(accountInfo: Account, req : PaymentMethodCreateRequest) : Promise<PaymentMethod> {
        const result = await this.billing.createPaymentMethod(accountInfo.billingId, req.token);
        await this.billing.setDefaultPaymentMethod(accountInfo.billingId, result.id);
        return result;
    }

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

        await this.billing.setDefaultPaymentMethod(accountInfo.billingId, pathParams.methodId);
        return {status:204};
    };

    async accountPaymentMethodsList(accountInfo: Account) : Promise<PaymentMethod[]> {
        return await this.billing.getPaymentMethods(accountInfo.billingId);
    }

    async accountUpdate(accountInfo: Account, req : AccountUpdateRequest) : Promise<void> {
        // Cancel in our billing system and in Router Limits.
        if (req.active === false) {
            return this.lock.acquire(LockNames.WebhookFreeze, async() => {
                await this.billing.cancel(accountInfo.billingId);
                await this.rl.cancel(accountInfo.id);
                return;
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

                return;
            })
        }
        else if (req.active === true) {
            // TODO if default plan will require payment, may want to check for payment method availability first

            // Activate the account in RL without specifying a plan. RL will subscribe the account to the default plan
            // and call us with a webhook if there is a change
            await this.rl.activate(accountInfo.id);
            return;
        }
        else {
            // Nothing to do. You're welcome
            return;
        }
    }
}
