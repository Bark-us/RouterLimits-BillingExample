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

const c : Configuration = config.util.toObject();

(async () => {
    const accounts = await SQLiteAccountsModel.createInstance("AccountsDatabase.sqlite");
    const rlController : IRouterLimitsWebhookController = new RouterLimitsWebhookController(new StripeBillingModel(c), accounts, new PlansModel(c.planMap));
    const billingController : IBillingWebhookController = new BillingWebhookController(c, accounts);
    const apiKeys = new ApiKeysModel(c.api.apiKeyTtl);
    const authController : IAuthenticationController = new AuthenticationController(c, accounts, apiKeys);
    const accountsController = new AccountsController();

    const apiServer = new ApiServer(c, rlController, billingController, authController, accountsController);
    console.log(`API listening on port ${apiServer.listenPort}`);
})();
