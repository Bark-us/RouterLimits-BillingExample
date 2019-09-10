import {ApiServer} from "./ApiServer";
import config from "config";
import {Configuration} from "./Config";
import {IRouterLimitsWebhookController, RouterLimitsWebhookController} from "./controllers/RouterLimitsWebhookController";
import {StripeBillingModel} from "./models/BillingModel";
import {SQLiteAccountsModel} from "./models/AccountsModel";
import {PlansModel} from "./models/PlansModel";
import {BillingWebhookController, IBillingWebhookController} from "./controllers/BillingWebhookController";
import {AuthenticationController, IAuthenticationController} from "./controllers/AuthenticationController";
import {ApiKeysModel} from "./models/ApiKeysModel";
import {AccountsController} from "./controllers/AccountsController";
import {RouterLimitsModel} from "./models/RouterLimitsModel";
import AsyncLock from 'async-lock';
import {PlansController} from "./controllers/PlansController";

const c : Configuration = config.util.toObject();

(async () => {
    const accounts = await SQLiteAccountsModel.createInstance("AccountsDatabase.sqlite");
    const billing = new StripeBillingModel(c);
    const apiKeys = new ApiKeysModel(c.api.apiKeyTtl);
    const rl = new RouterLimitsModel(c);
    const plans = new PlansModel(c.planMap);

    const lock = new AsyncLock();

    const rlWebhooks : IRouterLimitsWebhookController = new RouterLimitsWebhookController(billing, accounts, plans, lock);
    const billingWebhooks : IBillingWebhookController = new BillingWebhookController(c, accounts, lock);
    const authController : IAuthenticationController = new AuthenticationController(c, accounts, apiKeys);
    const accountsController = new AccountsController(billing, accounts, apiKeys, rl, plans, lock);
    const plansController = new PlansController(plans);

    const apiServer = new ApiServer(c, rlWebhooks, billingWebhooks, authController, accountsController, plansController);
    console.log(`API and Webhook handlers listening on port ${apiServer.listenPort}`);
})();
