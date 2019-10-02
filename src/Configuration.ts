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
    id : string;
    billingId : string;
    equivalentBillingIds? : Array<string>;
    name : string;
    default?: boolean;
}
