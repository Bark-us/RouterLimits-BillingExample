export interface IAccountsModel {

    /**
     * Get an account by its Router Limits id
     * @param id
     */
    get(id : string) : Promise<Account | undefined>;

    /**
     * Create a mapping between a Router Limits id and a billing system id
     * @param id
     * @param billingId
     */
    create(id : string, billingId: string) : Promise<void>;
}

export interface Account {
    /**
     * Router Limits account id
     */
    id : string;

    /**
     * Billing system id
     */
    billingId : string;
}

export class MockAccountsModel implements IAccountsModel {
    public readonly accounts : Map<string, Account>;

    constructor() {
        this.accounts = new Map();
    }

    create(id: string, billingId: string): Promise<void> {
        const a = this.accounts.get(id);
        if (a) {
            if (a.billingId === billingId) {
                return Promise.resolve();
            }
            return Promise.reject(new Error("Already created"));
        }

        this.accounts.set(id, {id : id, billingId: billingId});
        return Promise.resolve();
    }

    get(id: string): Promise<Account | undefined> {
        const a = this.accounts.get(id);
        return Promise.resolve(a);
    }

}
