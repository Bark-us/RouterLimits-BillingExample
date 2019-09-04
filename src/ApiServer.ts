import bodyParser from "body-parser";
import express from "express";
import http from "http";

import * as baseController from "./controllers/http/base";
import * as rlWebhookController from "./controllers/http/routerlimitswebhooks";
import * as billingWebhookController from "./controllers/http/billingwebhooks";
import {Configuration} from "Config";
import {IRouterLimitsController} from "./controllers/RouterLimitsController";
import {IBillingWebhookController} from "./controllers/BillingWebhookController";

export class ApiServer {
    get listenPort() : number {
        return this.server.address().port;
    }

    private readonly expressApp : express.Express;
    private readonly server : http.Server;

    constructor(config : Configuration, rlProcessor : IRouterLimitsController, billingProcessor : IBillingWebhookController) {
        this.expressApp = express();

        const greedyRawParser = bodyParser.raw({inflate: true, type: '*/*'});

        this.expressApp.get('/', baseController.index);
        this.expressApp.post('/webhooks/routerlimits', greedyRawParser, new rlWebhookController.RouterLimitsWebhookController(config, rlProcessor).router);
        this.expressApp.post('/webhooks/billing', greedyRawParser, new billingWebhookController.StripeWebhookController(config, billingProcessor).router);
        this.server = this.expressApp.listen(config.api.listenPort);
    }

    public close(callback? : Function) {
        this.server.close(callback);
    }
}
