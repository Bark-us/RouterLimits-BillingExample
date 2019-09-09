// import Ajv from 'ajv';
import AsyncLock from 'async-lock';
import {JsonRequestHandler} from "../http/JsonReceiver";
import {IBillingModel} from "../models/BillingModel";
import {IAccountsModel} from "../models/AccountsModel";
import {IApiKeysModel} from "../models/ApiKeysModel";
import {IRouterLimitsModel} from "../models/RouterLimitsModel";
import {LockNames} from "../Constants";

export interface IAccountsController {
    accountCreation : JsonRequestHandler;
    accountGet : JsonRequestHandler;
    accountUpdate : JsonRequestHandler;
    accountPaymentMethodsList : JsonRequestHandler;
    accountPaymentMethodCreation : JsonRequestHandler;
    accountPaymentMethodDelete : JsonRequestHandler;
    accountPaymentMethodSetDefault : JsonRequestHandler;
}

export class AccountsController implements IAccountsController {
    private readonly billing : IBillingModel;
    private readonly accounts: IAccountsModel;
    private readonly apiKeys: IApiKeysModel;
    private readonly rl: IRouterLimitsModel;
    private readonly lock: AsyncLock;

    constructor(billing: IBillingModel, accounts: IAccountsModel, apiKeys: IApiKeysModel, rl: IRouterLimitsModel, lock: AsyncLock) {
        this.billing = billing;
        this.accounts = accounts;
        this.apiKeys = apiKeys;
        this.rl = rl;
        this.lock = lock;
    }

    accountCreation: JsonRequestHandler = (pathParams, queryParams, body) => {
        // Make sure we have the params we expect (routerPairingCode is optional)
        if (!body.userId) {
            return Promise.resolve({status:400});
        }

        const request = body as AccountCreateRequest;

        // Locking to prevent race condition with webhook posted from Router Limits
        return this.lock.acquire(LockNames.CreateCustomerCreateAccount, async () => {
            // Create the account in Router Limits
            const accountId = await this.rl.createAccount(request.userId, request.routerPairingCode);
            const rlAccount = await this.rl.getAccount(accountId);

            if (!rlAccount.user) {
                throw new Error("Failed RL account lookup");
            }

            // Create customer in billing system
            const billingId = await this.billing.createCustomer(rlAccount.user.firstName, rlAccount.user.lastName, rlAccount.user.email);

            // Create account mapping
            const acctMapping = await this.accounts.create(accountId, billingId);

            // Create API key for new account
            const apiKey = await this.apiKeys.generate(acctMapping);

            const accountCreateResponse = {
                account: {
                    id: accountId,
                    active: false
                },
                apiKey: apiKey
            };

            return {status: 201, body: accountCreateResponse};
        });
    };

    accountGet: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
    };

    accountPaymentMethodCreation: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
    };

    accountPaymentMethodDelete: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
    };

    accountPaymentMethodSetDefault: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
    };

    accountPaymentMethodsList: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
    };

    accountUpdate: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
    };
}

type AccountCreateRequest = {userId: string, routerPairingCode?: string};
