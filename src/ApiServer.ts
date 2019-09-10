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
import {IPlansController} from "./controllers/PlansController";
import {AccountsReceiver} from "./http/AccountsReceiver";

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
                accountsController : IAccountsController,
                plansController : IPlansController
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

        const corsWrangler = (req: Request, res: Response, next: express.NextFunction) => {
            let origin = req.header("origin");
            if (origin) {
                origin = origin.toLowerCase();
            }

            const allowedOrigins = config.api.allowedOrigins;

            if (req.method.toLowerCase() === "options") {
                if (!origin || (allowedOrigins !== "*" && allowedOrigins.indexOf(origin) < 0)) {
                    res.sendStatus(403);
                    return;
                }

                res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key,Accept-Version');
                res.setHeader('Access-Control-Allow-Methods', 'DELETE,GET,POST');
                res.setHeader("Access-Control-Allow-Origin", origin);
                res.setHeader('Vary', 'Origin');
                res.setHeader('Access-Control-Expose-Headers', 'api-version, content-length, content-md5, content-type, date, request-id, response-time');
                res.setHeader('Access-Control-Max-Age', 86400);
                res.sendStatus(200);
                return;
            }
            else if (origin) {
                if (allowedOrigins !== "*" && allowedOrigins.indexOf(origin) < 0) {
                    res.sendStatus(403);
                    return;
                }
                res.setHeader("Access-Control-Allow-Origin", origin);
                res.setHeader('Access-Control-Expose-Headers', 'api-version, content-length, content-md5, content-type, date, request-id, response-time');
                next();
                return;
            }

            next();
        };

        const accountsReceiver = new AccountsReceiver(accountsController);

        // Webhooks
        this.expressApp.post('/webhooks/routerlimits', greedyRawParser, new RouterLimitsWebhookReceiver(config, rlController).router);
        this.expressApp.post('/webhooks/billing', greedyRawParser, new StripeWebhookReceiver(config, billingController).router);

        // Authenticate via JWT
        this.expressApp.route('/api/authenticate')
            .post(corsWrangler, jsonParser, new JsonReceiver(authController.handle).process)
            .options(corsWrangler);

        // Accounts
        this.expressApp.route('/api/accounts')
            .post(corsWrangler, jsonParser, accountsReceiver.acctCreate)
            .options(corsWrangler);
        this.expressApp.route('/api/accounts/:accountId')
            .get(corsWrangler, accountAuthHelper, jsonParser, accountsReceiver.acctGet)
            .post(corsWrangler, accountAuthHelper,jsonParser, accountsReceiver.acctUpdate)
            .options(corsWrangler);

        // Account payment methods
        this.expressApp.route('/api/accounts/:accountId/paymentMethods')
            .get(corsWrangler, accountAuthHelper,jsonParser, accountsReceiver.acctListPaymentMethods)
            .post(corsWrangler, accountAuthHelper,jsonParser, accountsReceiver.acctCreatePaymentMethod)
            .options(corsWrangler);
        this.expressApp.route('/api/accounts/:accountId/paymentMethods/:methodId')
            .delete(accountAuthHelper, jsonParser, new JsonReceiver(accountsController.accountPaymentMethodDelete).process)
            .options(corsWrangler);
        this.expressApp.route('/api/accounts/:accountId/paymentMethods/:methodId/setDefault')
            .post(corsWrangler, accountAuthHelper, jsonParser, new JsonReceiver(accountsController.accountPaymentMethodSetDefault).process)
            .options(corsWrangler);

        // Plans
        this.expressApp.get('/api/plans', new JsonReceiver(plansController.plansList).process);

        this.server = this.expressApp.listen(config.api.listenPort);
    }

    public close(callback? : Function) {
        this.server.close(callback);
    }
}
