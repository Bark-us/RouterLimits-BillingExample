import AsyncLock from 'async-lock';
import {IBillingModel} from "../models/BillingModel";
import {IAccountsModel} from "../models/AccountsModel";
import {IPlansModel} from "../models/PlansModel";
import {LockNames} from "../Constants";

/**
 * Represents a class which has the "business logic" of handling the Router Limits webhooks
 */
export interface IRouterLimitsWebhookController {
    handleAccountCreated(timestamp: number, accountId: string, firstName: string, lastName: string, email: string) : Promise<void>;
    handleAccountSubscriptionChange(timestamp : number, accountId : string, planId : string) : Promise<void>;
    handleAccountSubscriptionCancel(timestamp : number, accountId : string) : Promise<void>;
}

export class RouterLimitsWebhookController implements IRouterLimitsWebhookController {
    private readonly billing : IBillingModel;
    private readonly accounts : IAccountsModel;
    private readonly plans : IPlansModel;
    private readonly lock: AsyncLock;

    constructor(billing : IBillingModel, accounts : IAccountsModel, plans : IPlansModel, lock: AsyncLock) {
        this.billing = billing;
        this.accounts = accounts;
        this.plans = plans;
        this.lock = lock;
    }

    handleAccountCreated(timestamp: number, accountId: string, firstName: string, lastName: string, email: string): Promise<void> {
        return this.lock.acquire(LockNames.CreateCustomerCreateAccount, async () => {
            const account = await this.accounts.get(accountId);

            // No work to do if account already exists
            if (account) {
                return;
            }

            // Create customer in billing system
            const billingId = await this.billing.createCustomer(firstName, lastName, email);

            // Create mapping between billing system customer and Router Limits account
            await this.accounts.create(accountId, billingId);
        });
    }

    handleAccountSubscriptionCancel(timestamp: number, accountId: string): Promise<void> {
        // Lookup billing customer
        return this.accounts.get(accountId)
            .then((account) => {
                if (!account) {
                    return Promise.reject(new Error("No such account is known"));
                }

                // Cancel subscription in billing system
                return this.billing.cancel(account.billingId);
            })
    }

    handleAccountSubscriptionChange(timestamp: number, accountId: string, planId: string): Promise<void> {
        // Lookup billing customer
        // Lookup mapping of router limits plan to billing plan
        return Promise.all([
            this.accounts.get(accountId),
            this.plans.get(planId)
        ]).then((results) => {
            if (!results[0]) {
                return Promise.reject(new Error("No such account is known"));
            }

            if (!results[1]) {
                return Promise.reject(new Error("No such plan is known"));
            }
            // Subscribe billing customer to appropriate plan
            return this.billing.subscribe(results[0].billingId, results[1].billingId)
        })
    }

}
