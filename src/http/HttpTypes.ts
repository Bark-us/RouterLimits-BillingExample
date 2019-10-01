export type AccountCreateRequest = {userId: string, routerPairingCode?: string};
export type AccountCreateResponse = {account: ApiAccount, apiKey : string};
export type AccountUpdateRequest = {active?: boolean, planId?: string};
export type ApiAccount = {id: string, active: boolean, plan?: ApiPlan};
export type ApiPlan = {id: string, name: string};
export type PaymentMethod = {id: string, isDefault: boolean, cardInfo: {brand: string, expMonth: number, expYear: number, last4: string}};
export type PaymentMethodCreateRequest = {token: string, setDefault? : boolean};

/**
 The object that is added to Express response locals when a request is authenticated
 */
export type AccountAuthObject = {accountId: string};
