import {Configuration} from "../Config";
import {AccountApi, AccountApiApiKeys} from "../routerlimits/api/api/accountApi";
import {InlineObject} from "../routerlimits/api/model/inlineObject";
import {AccountsListResponse} from "../routerlimits/api/model/accountsListResponse";

export interface IRouterLimitsModel {
    createAccount(userId: string, routerPairingCode?: string) : Promise<string>;
    getAccount(accountId: string) : Promise<AccountsListResponse>;
}

export class MockRouterLimitsModel implements IRouterLimitsModel {
    async createAccount(userId: string, routerPairingCode?: string): Promise<string> {
        return "5";
    }

    async getAccount(accountId: string): Promise<AccountsListResponse> {
        return new AccountsListResponse();
    }
}

export class RouterLimitsModel implements IRouterLimitsModel {
    private readonly config: Configuration;

    constructor(config: Configuration) {
        this.config = config;
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

    private getApi() : AccountApi {
        const api = new AccountApi();
        if (this.config.routerlimits.apiBase) {
            api.basePath = this.config.routerlimits.apiBase;
        }

        api.setApiKey(AccountApiApiKeys.userApiKeyAuth, this.config.routerlimits.apiKey);
        return api;
    }
}
