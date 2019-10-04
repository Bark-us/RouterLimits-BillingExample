import AsyncLock from 'async-lock';
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
    accountGet(accountId : string) : Promise<ApiAccount>;
    accountUpdate(accountId: string, req : AccountUpdateRequest) : Promise<void>;
    accountPaymentMethodsList(accountId: string) : Promise<PaymentMethod[]>;
    accountPaymentMethodCreation(accountId: string, req : PaymentMethodCreateRequest) : Promise<PaymentMethod>;
    accountPaymentMethodDelete(accountId: string, methodId: string) : Promise<void>;
    accountPaymentMethodSetDefault(accountId: string, methodId: string) : Promise<void>;
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
            const apiKey = await this.apiKeys.generate(acctMapping.id);

            return {
                account: {
                    id: accountId,
                    active: false
                },
                apiKey: apiKey
            };
        })
    }

    async accountGet(accountId: string) : Promise<ApiAccount> {
        const accountInfo = await this.getAccountInfo(accountId);

        // Get billing id of plan
        const billingPlanId = await this.billing.get(accountInfo.billingId);

        // If no billing plan id set for the user, user is not subscribed
        if (!billingPlanId) {
            return {id: accountId, active: false}
        }

        // Get more information about the plan
        const plan = await this.plans.getByBillingId(billingPlanId);
        if (!plan) {
            throw new Error("Failed to find plan");
        }

        return {id: accountInfo.id, active: true, plan: {id: plan.id, name: plan.name}};
    }

    async accountPaymentMethodCreation(accountId: string, req : PaymentMethodCreateRequest) : Promise<PaymentMethod> {
        const accountInfo = await this.getAccountInfo(accountId);

        const result = await this.billing.createPaymentMethod(accountInfo.billingId, req.token);
        await this.billing.setDefaultPaymentMethod(accountInfo.billingId, result.id);
        return result;
    }

    async accountPaymentMethodDelete(accountId: string, methodId: string) : Promise<void> {
        const accountInfo = await this.getAccountInfo(accountId);

        await this.billing.deletePaymentMethod(accountInfo.billingId, methodId);
    }

    async accountPaymentMethodSetDefault(accountId: string, methodId: string) : Promise<void> {
        const accountInfo = await this.getAccountInfo(accountId);

        await this.billing.setDefaultPaymentMethod(accountInfo.billingId, methodId);
    }

    async accountPaymentMethodsList(accountId: string) : Promise<PaymentMethod[]> {
        const accountInfo = await this.getAccountInfo(accountId);

        return await this.billing.getPaymentMethods(accountInfo.billingId);
    }

    async accountUpdate(accountId: string, req : AccountUpdateRequest) : Promise<void> {
        const accountInfo = await this.getAccountInfo(accountId);

        // Cancel in our billing system and in Router Limits.
        if (req.active === false) {
            return this.lock.acquire(LockNames.WebhookFreeze, async() => {
                await this.billing.cancel(accountInfo.billingId);
                await this.rl.cancel(accountInfo.id);
                return;
            })
        }
        else {
            // Learn the billing id of the plan
            const planInfo = req.planId ? await this.plans.get(req.planId) : await this.plans.getDefault();
            if (!planInfo) {
                throw new Error("Failed to find plan");
            }

            if (planInfo.unavailable) {
                throw new Error("Cannot subscribe to unavailable plan");
            }

            return this.lock.acquire(LockNames.WebhookFreeze, async () => {
                // Subscribe in billing system first - it may fail due to no payment method, etc. But at this point we have
                // not done anything with RL API, so it's OK
                await this.billing.subscribe(accountInfo.billingId, planInfo.billingId);

                // Now we can make the same change in RL API
                await this.rl.subscribe(accountInfo.id, <string>req.planId);

                return;
            })
        }
    }

    private async getAccountInfo(accountId: string): Promise<Account> {
        // Get billing id of account
        const accountInfo = await this.accounts.get(accountId);
        if (!accountInfo) {
            throw new Error("Unknown account");
        }
        return accountInfo;
    }
}
