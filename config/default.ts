import {Configuration} from "Configuration.ts";

const c : Configuration = {
    api: {
        // Our API (including webhook handlers) will run on this port
        listenPort: 8080,

        // Number of seconds an API key should last before expiring
        apiKeyTtl: 3600,

        allowedOrigins: ['http://127.0.0.1']
    },

    // Level of logs that should be printed. 0 = Verbose, everything. 1 = Informational. 2 = Errors only.
    logLevel: 1,

    mysql : {
        connectionLimit : 10,
        host : "mysql.example.net",
        user : "dbuser",
        password : "dbpass",
        database : "billingsample"
    },

    // A mapping of Router Limits plan ids to the plan ids used in Stripe (or your billing system)
    // e.g. [{id:"ybpn94jx", billingId:"plan_FkEOY2mT5bLrca", name: "Essentials", default:true}, {id:"znwlb42m", billingId:"plan_FkEPE2q1Z3wTL1", name:"Plus"}, {id:"oq4a74zl", billingId:"plan_FkEQAeCJ2qYvzz", name: "Mega Bonus"}]
    planMap: [],

    routerlimits: {
        // Your Router Limits API key - use the Router Limits Pro Portal or contact Router Limits to obtain this
        apiKey: "",

        // This shared secret will be used to validate signatures for incoming webhooks and SSO requests from Router Limits.
        // Use the Router Limits Pro Portal to obtain it
        sharedSecret: "",

        // Webhooks will only be accepted within this many seconds of their attempt creation date
        webhookValidInterval: 300,

        jwtValidInterval: 300,

        // Your Router Limits organization id
        organiztionId: ""
    },

    // Settings for communicating with stripe. If you've implemented code for a different billing/payment system, this
    // section is probably unnecessary.
    stripe: {
        // Your stripe public API key
        publishableKey: "",

        // Your stripe secret key
        secretKey: "",

        // Shared secret used to verify signatures on incoming webhooks from Stripe
        webhookSecret: "",

        // Webhooks will only be accepted within this many seconds of their attempt creation date
        webhookValidInterval: 300,

        apiVersion: "2017-06-05"
    }
};

export default c;
