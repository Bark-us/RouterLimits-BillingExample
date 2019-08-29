export interface IBillingController {
    handleAccountSubscriptionCancel(timestamp : number, accountId : string) : Promise<void>;
}


