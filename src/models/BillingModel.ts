export interface IBillingModel {

    /**
     * Cancel the customer's subscription
     * @param id the customer's id
     */
    cancel(id : string) : Promise<void>;

    /**
     * Create a customer in the billing system. Return the id
     */
    createCustomer() : Promise<string>;

    /**
     * Retrieve the billing plan id that a customer is subscribed to
     * @param id
     */
    get(id : string) : Promise<string | null>;

    /**
     * Subscribe a customer to the specified plan
     * @param id the customer's id
     * @param planId the plan's id
     */
    subscribe(id : string, planId : string) : Promise<void>;
}

export class MockBillingModel implements IBillingModel {
    private readonly customers : Map<string, {planId : string | null}>;
    private nextId : number;

    constructor() {
        this.customers = new Map();
        this.nextId = 0;
    }

    cancel(id: string): Promise<void> {
        const c = this.customers.get(id);
        if (!c) {
            return Promise.reject(new Error("No such billing customer"));
        }

        c.planId = null;
        return Promise.resolve();
    }

    createCustomer(): Promise<string> {
        const id : string = `${this.nextId++}`;
        this.customers.set(id, {planId : null});
        return Promise.resolve(id);
    }

    get(id: string) : Promise<string | null> {
        const c = this.customers.get(id);
        if (!c) {
            return Promise.reject(new Error("No such billing customer"));
        }

        return Promise.resolve(c.planId);
    }

    subscribe(id: string, planId: string): Promise<void> {
        const c = this.customers.get(id);
        if (!c) {
            return Promise.reject(new Error("No such billing customer"));
        }

        c.planId = planId;
        return Promise.resolve();
    }
}
