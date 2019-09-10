import {AccountApi, AccountApiApiKeys} from "../routerlimits/api/api/accountApi";
import AsyncLock from 'async-lock';
import {Configuration} from "../Config";
import {IAccountsModel} from "../models/AccountsModel";
import {LockNames} from "../Constants";

/**
 * Represents a class that implements the business logic for handling webhooks from a billing system
 */
export interface IBillingWebhookController {
    handleAccountSubscriptionCancel(timestamp : number, billingAccountId : string) : Promise<void>;
}

export class BillingWebhookController implements IBillingWebhookController {
    private readonly config : Configuration;
    private readonly accounts : IAccountsModel;
    private readonly lock : AsyncLock;

    constructor(config : Configuration, accounts : IAccountsModel, lock : AsyncLock) {
        this.config = config;
        this.accounts = accounts;
        this.lock = lock;
    }

    handleAccountSubscriptionCancel(timestamp: number, billingAccountId: string): Promise<void> {
        return this.lock.acquire(LockNames.WebhookFreeze, () => {
            // Lookup Router Limits account id from billing account id
            return this.accounts.getByBillingId(billingAccountId).then((accountInfo) => {
                if (!accountInfo || !accountInfo.id) {
                    return Promise.reject(new Error("Unknown account"));
                }

                // Call Router Limits API, make sure account is canceled
                const api = new AccountApi();
                api.setApiKey(AccountApiApiKeys.userApiKeyAuth, this.config.routerlimits.apiKey);
                if (this.config.routerlimits.apiBase) {
                    api.basePath = this.config.routerlimits.apiBase;
                }

                return api.accountsAccountIdSubscriptionsGet(accountInfo.id).then((res) => {
                    if (!res || !res.response || res.response.statusCode !== 200) {
                        return Promise.reject(new Error("Failed to query subscriptions"));
                    }

                    // If not subscription, good - nothing to cancel.
                    if (res.body.length <= 0) {
                        return Promise.resolve();
                    }

                    // We only check first subscription - current RL system only supports single subscription.
                    // If the subscription is newer than our cancel webhook, then we should NOT cancel it.
                    if (res.body[0].subscriptionStartTime > timestamp) {
                        return Promise.resolve();
                    }

                    // Otherwise, cancel it
                    return api.accountsAccountIdSubscriptionsSubscriptionIdDelete(accountInfo.id, res.body[0].id).then((res) => {
                        if (res && res.response && res.response.statusCode !== 204) {
                            return Promise.reject(new Error("Failed to cancel"));
                        }
                        return Promise.resolve();
                    });
                });
            })
        })
    }
}
