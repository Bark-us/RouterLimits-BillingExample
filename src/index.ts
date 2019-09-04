import {ApiServer} from "./ApiServer";
import config from "config";
import {Configuration} from "./Config";
import {IRouterLimitsWebhookController, RouterLimitsWebhookController} from "./controllers/RouterLimitsWebhookController";
import {StripeBillingModel} from "./models/BillingModel";
import {SQLiteAccountsModel} from "./models/AccountsModel";
import {PlansModel} from "./models/PlansModel";
import {BillingWebhookController, IBillingWebhookController} from "./controllers/BillingWebhookController";

const c : Configuration = config.util.toObject();

(async () => {
    const accounts = await SQLiteAccountsModel.createInstance("AccountsDatabase.sqlite");
    const rlController : IRouterLimitsWebhookController = new RouterLimitsWebhookController(new StripeBillingModel(c), accounts, new PlansModel(c.planMap));
    const billingController : IBillingWebhookController = new BillingWebhookController(c, accounts);

    const apiServer = new ApiServer(c, rlController, billingController);
    console.log(`API listening on port ${apiServer.listenPort}`);
})();
