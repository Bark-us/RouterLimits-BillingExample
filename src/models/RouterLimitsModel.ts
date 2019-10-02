import {Configuration} from "../Configuration";
import {AccountApi, AccountApiApiKeys} from "../routerlimits/api/api/accountApi";
import {InlineObject} from "../routerlimits/api/model/inlineObject";
import {AccountsListResponse} from "../routerlimits/api/model/accountsListResponse";
import {InlineObject4} from "../routerlimits/api/model/inlineObject4";
import {AccountSubscriptionsListResponse} from "../routerlimits/api/model/accountSubscriptionsListResponse";

export interface IRouterLimitsModel {
    activate(accountId: string) : Promise<void>;
    cancel(accountId: string) : Promise<void>;
    createAccount(userId: string, routerPairingCode?: string) : Promise<string>;
    getAccount(accountId: string) : Promise<AccountsListResponse>;
    getSubscriptions(accountId: string) : Promise<AccountSubscriptionsListResponse[]>;
    subscribe(accountId: string, planId: string) : Promise<void>;
}

export class MockRouterLimitsModel implements IRouterLimitsModel {
    private accounts : Map<string, {userId: string, accountId: string}>;

    constructor() {
        this.accounts = new Map();
    }

    async activate(accountId: string): Promise<void> {
    }

    async cancel(accountId: string): Promise<void> {
    }

    async createAccount(userId: string, routerPairingCode?: string): Promise<string> {
        const accountId = `acct_${userId}`;
        if (this.accounts.has(accountId)) {
            throw new Error("Account exists");
        }

        this.accounts.set(accountId, {userId: userId, accountId: accountId});
        return accountId;
    }

    async getAccount(accountId: string): Promise<AccountsListResponse> {
        const info = this.accounts.get(accountId);
        if (!info) {
            throw new Error("No such account");
        }

        const toRet = new AccountsListResponse();
        toRet.id = info.accountId;
        toRet.userId = info.userId;
        toRet.user = {id: info.userId, firstName: "Test", lastName: "User", email: "email@example.net", phone: "1234567890", roles: []};
        return toRet;
    }

    async getSubscriptions(accountId: string) : Promise<AccountSubscriptionsListResponse[]> {
        return [];
    }

    async subscribe(accountId: string, planId: string) : Promise<void> {
    }
}

export class RouterLimitsModel implements IRouterLimitsModel {
    private readonly config: Configuration;

    constructor(config: Configuration) {
        this.config = config;
    }

    async activate(accountId: string): Promise<void> {
        await this.getApi().accountsAccountIdReactivatePost(accountId);
    }

    async cancel(accountId: string): Promise<void> {
        await this.getApi().accountsAccountIdCancelPost(accountId);
    }

    async createAccount(userId: string, routerPairingCode?: string): Promise<string> {
        const req = new InlineObject();
        req.userId = userId;
        req.routerPairingCode = routerPairingCode || undefined;
        req.parentOrganizationId = this.config.routerlimits.organiztionId;

        const result = await this.getApi().accountsPost(req);
        return result.body.accountId;
    }

    async getAccount(accountId: string): Promise<AccountsListResponse> {
        const result = await this.getApi().accountsAccountIdGet(accountId);
        return result.body;
    }

    async getSubscriptions(accountId: string) : Promise<AccountSubscriptionsListResponse[]> {
        return (await this.getApi().accountsAccountIdSubscriptionsGet(accountId)).body;
    }

    async subscribe(accountId: string, planId: string): Promise<void> {
        const req = new InlineObject4();
        req.planId = planId;
        await this.getApi().accountsAccountIdSubscriptionsPost(accountId, req);
    }

    private getApi() : AccountApi {
        const api = new AccountApi();
        if (this.config.routerlimits.apiBase) {
            api.basePath = this.config.routerlimits.apiBase;
        }

        api.setApiKey(AccountApiApiKeys.userApiKeyAuth, this.config.routerlimits.apiKey);
        return api;
    }
}
