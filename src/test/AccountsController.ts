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
            new PlansModel([{id: "coolplan", name: "Cool Plan", billingId: "billing_coolplan", default: true}]),
            new AsyncLock()
        )
    });

    it("Functional Tests", async () => {
        // Create
        const createdInfo = await controller.accountCreation({userId: "asdf"});

        // Verify not active
        let acct = await controller.accountGet(createdInfo.account.id);
        if (acct.active) {
            throw new Error("Account should not be active");
        }

        // Activate and verify active
        await controller.accountUpdate(createdInfo.account.id, {active: true});
        acct = await controller.accountGet(createdInfo.account.id);
        if (!acct.active) {
            throw new Error("Account should be active");
        }

        // Cancel and verify inactive
        await controller.accountUpdate(createdInfo.account.id, {active: false});
        acct = await controller.accountGet(createdInfo.account.id);
        if (acct.active) {
            throw new Error("Account should not be active");
        }

        // Verify no payment methods
        let methods = await controller.accountPaymentMethodsList(createdInfo.account.id);
        if (methods.length > 0) {
            throw new Error("Expected no methods");
        }

        // Create method and verify it exists
        const method = await controller.accountPaymentMethodCreation(createdInfo.account.id, {token: "BeefSteak"});
        methods = await controller.accountPaymentMethodsList(createdInfo.account.id);
        if (methods.length !== 1) {
            throw new Error("Expected one method");
        }
        if (method.id !== methods[0].id) {
            throw new Error("Method doesn't match");
        }

        // Set method as default
        await controller.accountPaymentMethodSetDefault(createdInfo.account.id, method.id);

        // Delete method
        await controller.accountPaymentMethodDelete(createdInfo.account.id, method.id);

        // Verify no payment methods
        methods = await controller.accountPaymentMethodsList(createdInfo.account.id);
        if (methods.length > 0) {
            throw new Error("Expected no methods");
        }
    });
});
