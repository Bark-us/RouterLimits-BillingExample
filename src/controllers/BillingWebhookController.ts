import AsyncLock from 'async-lock';
import {IAccountsModel} from "../models/AccountsModel";
import {LockNames} from "../Constants";
import {IRouterLimitsModel} from "../models/RouterLimitsModel";

/**
 * Represents a class that implements the business logic for handling webhooks from a billing system
 */
export interface IBillingWebhookController {
    handleAccountSubscriptionCancel(timestamp : number, billingAccountId : string) : Promise<void>;
}

export enum BillingWebhookControllerErrorString {
    UNKNOWN_ACCOUNT = "UNKNOWN_ACCOUNT"
}

class BillingWebhookControllerError extends Error {
    public specialCase? : string;

    constructor(m: string) {
        super(m);
    }
}

export class BillingWebhookController implements IBillingWebhookController {
    private readonly accounts : IAccountsModel;
    private readonly rl : IRouterLimitsModel;
    private readonly lock : AsyncLock;

    constructor(accounts : IAccountsModel, rl : IRouterLimitsModel, lock : AsyncLock) {
        this.accounts = accounts;
        this.rl = rl;
        this.lock = lock;
    }

    handleAccountSubscriptionCancel(timestamp: number, billingAccountId: string): Promise<void> {
        return this.lock.acquire(LockNames.WebhookFreeze, async () => {
            // Lookup Router Limits account id from billing account id
            const accountInfo = await this.accounts.getByBillingId(billingAccountId);
            if (!accountInfo || !accountInfo.id) {
                const err = new BillingWebhookControllerError("No such account with that billingId");
                err.specialCase = BillingWebhookControllerErrorString.UNKNOWN_ACCOUNT;
                throw err;
            }

            const rlSubs = await this.rl.getSubscriptions(accountInfo.id);

            // Nothing to do ? Then we're done
            if (rlSubs.length <= 0)
                return;

            // If subscription was created after our timestamp, don't cancel - webhooks can be delayed
            if (rlSubs[0].subscriptionStartTime > timestamp) {
                return;
            }

            await this.rl.cancel(accountInfo.id);
        })
    }
}
