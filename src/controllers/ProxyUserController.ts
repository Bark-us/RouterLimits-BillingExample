import {UserApi} from "../routerlimits/api/api/userApi";
import {Configuration} from "../Configuration";

export interface IProxyUserController {
    createUser(params : object) : Promise<string>;
}

export class MockProxyUserController implements IProxyUserController {
    async createUser(params: object): Promise<string> {
        return "asdf567";
    }
}

export class ProxyUserController implements IProxyUserController {
    private readonly config : Configuration;

    constructor(config : Configuration) {
        this.config = config;
    }

    async createUser(params : any) : Promise<string> {
        const api = new UserApi();
        // Insufficient to set key here because swagger doesn't handle optional authentication and won't include the key
        // Instead, we do it manually below
        // api.setApiKey(UserApiApiKeys.userApiKeyAuth, this.config.routerlimits.apiKey);

        if (this.config.routerlimits.apiBase) {
            api.basePath = this.config.routerlimits.apiBase;
        }

        if (params.organizationId) {
            throw new Error("Parameter not allowed");
        }

        const res = await api.usersPost(params, {headers: {'x-api-key' : "this.config.routerlimits.apiKey"}});

        if (!res || !res.body || !res.body.userId) {
            throw new Error("Unknown error creating user");
        }
        return res.body.userId;
    }
}
