
export interface Configuration {

    api : {
        listenPort : number;
    }

    // Maps Router Limits plan ids to Stripe plan ids
    planMap : Array<PlanMapping>;

    routerlimits : {
        apiKey : string;

        sharedSecret : string;

        webhookValidInterval : number;
    }

    stripe : {
        publishableKey : string;
        secretKey : string;
    }
}

interface PlanMapping {
    rlPlanId : string;
    stripePlanId : string;
}
