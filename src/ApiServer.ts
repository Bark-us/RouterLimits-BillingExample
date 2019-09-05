import bodyParser from "body-parser";
import express from "express";
import http from "http";

import {RouterLimitsWebhookReceiver} from "./http/RouterLimitsWebhookReceiver";
import {StripeWebhookReceiver} from "./http/StripeWebhookReceiver";
import {Configuration} from "Config";
import {IRouterLimitsWebhookController} from "./controllers/RouterLimitsWebhookController";
import {IBillingWebhookController} from "./controllers/BillingWebhookController";
import {JsonReceiver} from "./http/JsonReceiver";
import {IAuthenticationController} from "./controllers/AuthenticationController";

export class ApiServer {
    get listenPort() : number {
        return this.server.address().port;
    }

    private readonly expressApp : express.Express;
    private readonly server : http.Server;

    constructor(config : Configuration,
                rlController : IRouterLimitsWebhookController,
                billingController : IBillingWebhookController,
                authController : IAuthenticationController
    ) {
        this.expressApp = express();

        const greedyRawParser = bodyParser.raw({inflate: true, type: '*/*'});
        const jsonParser = bodyParser.json();

        this.expressApp.post('/webhooks/routerlimits', greedyRawParser, new RouterLimitsWebhookReceiver(config, rlController).router);
        this.expressApp.post('/webhooks/billing', greedyRawParser, new StripeWebhookReceiver(config, billingController).router);

        this.expressApp.post('/api/authenticate', jsonParser, new JsonReceiver(authController.handle).process);

        this.server = this.expressApp.listen(config.api.listenPort);
    }

    public close(callback? : Function) {
        this.server.close(callback);
    }
}
