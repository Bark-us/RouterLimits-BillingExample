import {ApiServer} from "./ApiServer";
import config from "config";
import {Configuration} from "./Configuration";
import {
    IRouterLimitsWebhookController,
    RouterLimitsWebhookController
} from "./controllers/RouterLimitsWebhookController";
import {StripeBillingModel} from "./models/BillingModel";
import {IAccountsModel, MySQLAccountsModel, SQLiteAccountsModel} from "./models/AccountsModel";
import {PlansModel} from "./models/PlansModel";
import {BillingWebhookController, IBillingWebhookController} from "./controllers/BillingWebhookController";
import {AuthenticationController, IAuthenticationController} from "./controllers/AuthenticationController";
import {IApiKeysModel, MySQLApiKeysModel, SQLiteApiKeysModel} from "./models/ApiKeysModel";
import {AccountsController} from "./controllers/AccountsController";
import {RouterLimitsModel} from "./models/RouterLimitsModel";
import AsyncLock from 'async-lock';
import {PlansController} from "./controllers/PlansController";
import {ConsoleLoggingModel, LogLevel} from "./models/LoggingModel";
import mysql from "mysql";
import {ProxyUserController} from "./controllers/ProxyUserController";

const c : Configuration = config.util.toObject();

(async () => {

    const log = new ConsoleLoggingModel(c.logLevel);

    let accounts : IAccountsModel;
    let apiKeys : IApiKeysModel;

    // If MySQL is configured, use it. Otherwise, use sqlite
    if (c.mysql) {
        log.log(LogLevel.DEBUG, `Using MySQL server at ${c.mysql.host}`);
        const mysqlPool = mysql.createPool(c.mysql);
        accounts = new MySQLAccountsModel(mysqlPool);
        apiKeys = new MySQLApiKeysModel(mysqlPool, c.api.apiKeyTtl);
    }
    else {
        log.log(LogLevel.DEBUG, `Using SQLite`);
        accounts = await SQLiteAccountsModel.createInstance("AccountsDatabase.sqlite");
        apiKeys = await SQLiteApiKeysModel.createInstance("ApiKeysDatabase.sqlite", c.api.apiKeyTtl);
    }

    const plans = new PlansModel(c.planMap);
    const billing = new StripeBillingModel(c, plans);
    const rl = new RouterLimitsModel(c);

    const lock = new AsyncLock();

    const rlWebhooks : IRouterLimitsWebhookController = new RouterLimitsWebhookController(billing, accounts, plans, rl, lock);
    const billingWebhooks : IBillingWebhookController = new BillingWebhookController(accounts, rl, lock);
    const authController : IAuthenticationController = new AuthenticationController(c, accounts, apiKeys);
    const accountsController = new AccountsController(billing, accounts, apiKeys, rl, plans, lock);
    const plansController = new PlansController(plans);
    const proxyUsersController = new ProxyUserController(c);

    const apiServer = new ApiServer(c, rlWebhooks, billingWebhooks, authController, accountsController, plansController, proxyUsersController, log);
    log.log(LogLevel.INFO, `API and Webhook handlers listening on port ${apiServer.listenPort}`);
})();
