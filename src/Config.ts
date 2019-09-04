
export interface Configuration {

    api : {
        listenPort : number;
    }

    // Maps Router Limits plan ids to Stripe plan ids
    planMap : Array<PlanMapping>;

    routerlimits : {
        apiBase? : string;

        apiKey : string;

        sharedSecret : string;

        webhookValidInterval : number;
    }

    stripe : {
        publishableKey : string;
        secretKey : string;
        webhookSecret : string;
        webhookValidInterval : number;
    }
}

export interface PlanMapping {
    id : string;
    billingId : string;
}
