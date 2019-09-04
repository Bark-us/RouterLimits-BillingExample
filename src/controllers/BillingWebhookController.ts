import {AccountApi, AccountApiApiKeys} from "../routerlimits/api/api/accountApi";
import {Configuration} from "../Config";
import {IAccountsModel} from "../models/AccountsModel";

export interface IBillingWebhookController {
    handleAccountSubscriptionCancel(timestamp : number, billingAccountId : string) : Promise<void>;
}

export class BillingWebhookController implements IBillingWebhookController {
    private readonly config : Configuration;
    private readonly accounts : IAccountsModel;

    constructor(config : Configuration, accounts : IAccountsModel) {
        this.config = config;
        this.accounts = accounts;
    }

    handleAccountSubscriptionCancel(timestamp: number, billingAccountId: string): Promise<void> {
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

    }
}
