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
import {IAccountsController} from "./controllers/AccountsController";
import {Request, Response} from "express";

export class ApiServer {
    get listenPort() : number {
        return this.server.address().port;
    }

    private readonly expressApp : express.Express;
    private readonly server : http.Server;

    constructor(config : Configuration,
                rlController : IRouterLimitsWebhookController,
                billingController : IBillingWebhookController,
                authController : IAuthenticationController,
                accountsController : IAccountsController
    ) {
        this.expressApp = express();

        const greedyRawParser = bodyParser.raw({inflate: true, type: '*/*'});
        const jsonParser = bodyParser.json();

        const accountAuthHelper = (req: Request, res: Response, next: express.NextFunction) => {
            const apiKey = req.header('x-api-key');
            if (apiKey) {
                authController.validateApiKey(apiKey).then((account) => {
                    if (account) {
                        res.locals.account = account;
                        return next();
                    }
                    res.status(401);
                    res.send();
                    return;
                })
            }
            else {
                res.sendStatus(401);
            }
        };

        // Webhooks
        this.expressApp.post('/webhooks/routerlimits', greedyRawParser, new RouterLimitsWebhookReceiver(config, rlController).router);
        this.expressApp.post('/webhooks/billing', greedyRawParser, new StripeWebhookReceiver(config, billingController).router);

        // Authenticate via JWT
        this.expressApp.post('/api/authenticate', jsonParser, new JsonReceiver(authController.handle).process);

        // Accounts
        this.expressApp.post('/api/accounts', jsonParser, new JsonReceiver(accountsController.accountCreation).process);
        this.expressApp.route('/api/accounts/:accountId')
            .get(accountAuthHelper, jsonParser, new JsonReceiver(accountsController.accountGet).process)
            .post(accountAuthHelper,jsonParser, new JsonReceiver(accountsController.accountUpdate).process);

        // Account payment methods
        this.expressApp.route('/api/accounts/:accountId/paymentMethods')
            .get(accountAuthHelper,jsonParser, new JsonReceiver(accountsController.accountPaymentMethodsList).process)
            .post(accountAuthHelper,jsonParser, new JsonReceiver(accountsController.accountPaymentMethodCreation).process);
        this.expressApp.delete('/api/accounts/:accountId/paymentMethods/:methodId', accountAuthHelper, jsonParser, new JsonReceiver(accountsController.accountPaymentMethodDelete).process);
        this.expressApp.post('/api/accounts/:accountId/paymentMethods/:methodId/setDefault', accountAuthHelper, jsonParser, new JsonReceiver(accountsController.accountPaymentMethodSetDefault).process);

        this.server = this.expressApp.listen(config.api.listenPort);
    }

    public close(callback? : Function) {
        this.server.close(callback);
    }
}
