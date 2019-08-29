import {ApiServer} from "./ApiServer";
import config from "config";
import {Configuration} from "./Config";
import {IRouterLimitsController, RouterLimitsController} from "./controllers/RouterLimitsController";
import {MockBillingModel} from "./models/BillingModel";
import {MockAccountsModel} from "./models/AccountsModel";
import {PlansModel} from "./models/PlansModel";

// const c : Configuration = require('smarf.json');
const c : Configuration = config.util.toObject();

const rlController : IRouterLimitsController = new RouterLimitsController(new MockBillingModel(), new MockAccountsModel(), new PlansModel(c.planMap));

const apiServer = new ApiServer(c, rlController);
// console.log(`API listening on port ${apiServer.listenPort}`);
