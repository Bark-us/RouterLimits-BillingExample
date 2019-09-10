import Stripe from 'stripe';
import {Configuration} from "../Config";
import ISubscription = Stripe.subscriptions.ISubscription;

export interface IBillingModel {

    /**
     * Cancel the customer's subscription
     * @param id the customer's id
     */
    cancel(id : string) : Promise<void>;

    /**
     * Create a customer in the billing system. Return the id
     */
    createCustomer(firstName: string, lastName: string, email: string) : Promise<string>;

    /**
     * Retrieve the billing plan id that a customer is subscribed to
     * @param id
     */
    get(id : string) : Promise<string | null>;

    getPaymentMethods(billingId: string) : Promise<Array<PaymentMethod>>;

    /**
     * Subscribe a customer to the specified plan
     * @param billingId the customer's id
     * @param planBillingId the plan's billing id
     */
    subscribe(billingId : string, planBillingId : string) : Promise<void>;
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

    createCustomer(firstName: string, lastName: string, email: string): Promise<string> {
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

    async getPaymentMethods(billingId: string): Promise<Array<PaymentMethod>> {
        return [];
    }
}

export class StripeBillingModel implements IBillingModel {
    private readonly stripe : Stripe;
    private readonly knownPlanIds : Set<string>;

    constructor(config : Configuration) {
        this.stripe = new Stripe(config.stripe.secretKey, config.stripe.apiVersion);

        this.knownPlanIds = new Set<string>();
        config.planMap.forEach((mapping) => {
            this.knownPlanIds.add(mapping.billingId);
        })
    }

    cancel(id: string): Promise<void> {
        return this.findOurSubscription(id).then((sub) => {
            // No action needed if we aren't subscribed
            if (!sub || !sub.plan) {
                return Promise.resolve();
            }

            // Otherwise, cancel the sub
            return this.stripe.subscriptions.del(sub.id).then(() => {
                return Promise.resolve();
            });
        })
    }

    createCustomer(firstName: string, lastName: string, email: string): Promise<string> {
        return this.stripe.customers.create({name : `${firstName} ${lastName}`, email: email}).then((customer) => {
            return Promise.resolve(customer.id);
        })
    }

    get(id: string): Promise<string | null> {
        return this.findOurSubscription(id).then((sub) => {
            if (sub && sub.plan) {
                return Promise.resolve(sub.plan.id);
            }
            return Promise.resolve(null);
        })
    }

    async getPaymentMethods(billingId: string): Promise<PaymentMethod[]> {
        const obj = await this.stripe.customers.retrieve(billingId);

        // TODO support methods besides cards, if desired
        const cards = obj.sources ? obj.sources.data.filter((s) => {
            return s.object === "card";
        }) : [];

        return cards.map((c) => {
            const cardInfo = c as Stripe.ICard;
            return {
                id: c.id,
                isDefault: c.id === obj.default_source,
                cardInfo: {
                    brand: cardInfo.brand,
                    expMonth: cardInfo.exp_month,
                    expYear: cardInfo.exp_year,
                    last4: cardInfo.last4
                }
            }
        });
    }

    subscribe(id: string, planId: string): Promise<void> {
        return this.findOurSubscription(id).then((sub) => {
            // If we don't have one, create one
            if (!sub || !sub.plan) {
                return this.stripe.subscriptions.create({customer: id, plan : planId}).then(() => {
                    return Promise.resolve();
                })
            }

            // If we do have an existing subscription:
            // No action needed if sub is already on desired plan
            if (sub.plan.id === planId) {
                return Promise.resolve();
            }

            // action needed if sub is not on desired plan
            return this.stripe.subscriptions.update(sub.id, {plan:planId}).then(() => {
                return Promise.resolve();
            });
        })
    }

    // For testing - returns created plan id
    createPlan() : Promise<string> {
        return this.stripe.plans.create({amount: 0, currency: 'usd', interval: 'month', product: {name: 'StripeBillingModel Test Plan'}}).then((plan) => {
            return Promise.resolve(plan.id);
        })
    }

    private findOurSubscription(id : string) : Promise<ISubscription | null> {
        return this.stripe.subscriptions.list({customer:id, limit: 100}).autoPagingToArray({limit: 1000}).then((subs) => {
            const ourSub = subs.find((s) => {
                if (s && s.plan && this.knownPlanIds.has(s.plan.id)) {
                    return true;
                }
                return false;
            });

            if (ourSub && ourSub) {
                return Promise.resolve(ourSub);
            }
            return Promise.resolve(null);
        })
    }
}

export type PaymentMethod = {id: string, isDefault: boolean, cardInfo: {brand: string, expMonth: number, expYear: number, last4: string}};
