import {JsonRequestHandler} from "../http/JsonReceiver";

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
    constructor() {

    }

    accountCreation: JsonRequestHandler = (pathParams, queryParams, body) => {
        return Promise.resolve({status:501});
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
