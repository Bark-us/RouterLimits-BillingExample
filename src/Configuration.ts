import {LogLevel} from "./models/LoggingModel";

export interface Configuration {

    api : {
        listenPort : number;
        apiKeyTtl : number;
        allowedOrigins: Array<string> | "*";
    }

    isTest? : boolean;

    logLevel : LogLevel;

    mysql? : {
        connectionLimit : number;
        host : string;
        user : string;
        password : string;
        database : string;
    }

    // Maps Router Limits plan ids to Stripe plan ids
    planMap : Array<PlanMapping>;

    routerlimits : {
        apiBase? : string;

        apiKey : string;

        sharedSecret : string;

        webhookValidInterval : number;

        jwtValidInterval : number;

        organiztionId : string;
    }

    stripe : {
        publishableKey : string;
        secretKey : string;
        webhookSecret : string;
        webhookValidInterval : number;
        apiVersion : string;
    }
}

export interface PlanMapping {
    // id of the plan in Router Limits
    id : string;

    // id of the plan in your billing system
    billingId : string;

    // ids of other plans in your billing system that can be thought of as equivalent to billingId
    equivalentBillingIds? : Array<string>;

    // User-friendly name that will be reported via API
    name : string;

    // Set true if this plan is the one that accounts should be subscribed to if the API activation request doesn't specify
    // Exactly one plan must be default.
    default?: boolean;

    // Set to true if this plan is not available for new subscriptions
    unavailable?: boolean;

    // Set to true if accounts created by the ACCOUNT_MOVE_IN webhook should be subscribed to this plan instead of
    // whatever one they're on now. If no plan is set moveInDefault, then any subscription on the account will be canceled.
    // If the account is already inactive/canceled, it will not be modified in any case.
    // Exactly zero or one plans may be marked moveInDefault
    moveInDefault?: boolean;
}
