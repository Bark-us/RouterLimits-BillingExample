import "mocha"
import AsyncLock from 'async-lock';
import {AccountsController, IAccountsController} from "../controllers/AccountsController";
import {MockBillingModel} from "../models/BillingModel";
import {MockAccountsModel} from "../models/AccountsModel";
import {ApiKeysModel} from "../models/ApiKeysModel";
import {MockRouterLimitsModel} from "../models/RouterLimitsModel";
import {PlansModel} from "../models/PlansModel";

describe("AccountsController", () => {
    let controller : IAccountsController;

    beforeEach(() => {
        let rl = new MockRouterLimitsModel();
        controller = new AccountsController(
            new MockBillingModel(),
            new MockAccountsModel(),
            new ApiKeysModel(10),
            rl,
            new PlansModel([]),
            new AsyncLock()
        )
    });

    it("Functional Tests", async () => {
        const createdInfo = await controller.accountCreation({userId: "asdf"});

        await controller.accountGet(createdInfo.account.id);
    });
});
