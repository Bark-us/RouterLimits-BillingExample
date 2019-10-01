import {PlanMapping} from "../Config";

export interface IPlansModel {
    /**
     * Get plan info by Router Limits id
     * @param id Router Limits id of the plan
     */
    get(id : string) : Promise<PlanMapping | undefined>;

    getAll() : Promise<Array<PlanMapping>>;

    /**
     * Get plan info by billing system id. It will first try to find the exact match based on billingId property,
     * but if no mapping is found, it will search the equivalentBillingIds array (if present)
     * @param billingId billing system id of the plan
     */
    getByBillingId(billingId: string) : Promise<PlanMapping | undefined>;

    /**
     * Get the configured default plan
     */
    getDefault() : Promise<PlanMapping | undefined>;
}

export class PlansModel implements IPlansModel {
    private readonly rlPlansToPlans : Map<String, PlanMapping>;
    private readonly billingPlanstoPlans : Map<string, PlanMapping>;
    private readonly equivalentBillingPlanstoPlans : Map<string, PlanMapping>;
    private readonly defaultPlan : PlanMapping;

    constructor(plans : Array<PlanMapping>) {
        this.rlPlansToPlans = new Map();
        this.billingPlanstoPlans = new Map();
        this.equivalentBillingPlanstoPlans = new Map();

        // Loop through the PlanMappings and index them.
        // Also find the default plan. Make sure there is exactly one
        let defaultPlan : PlanMapping | undefined;
        plans.forEach((p) => {
            if (p.default) {
                if (defaultPlan) {
                    throw new Error("Only a single default is allowed");
                }
                defaultPlan = p;
            }

            this.rlPlansToPlans.set(p.id, p);
            this.billingPlanstoPlans.set(p.billingId, p);

            // If this PlanMapping has equivalentBillingids, index those so we can do lookups by them efficiently
            if (p.equivalentBillingIds) {
                for (const equivalentBillingId of p.equivalentBillingIds) {
                    if (this.equivalentBillingPlanstoPlans.has(equivalentBillingId)) {
                        throw new Error(`Equivalent billingId '${equivalentBillingId}' is configured for more than one PlanMapping`);
                    }

                    this.equivalentBillingPlanstoPlans.set(equivalentBillingId, p);
                }
            }
        });

        if (!defaultPlan) {
            throw new Error("A default plan must be configured");
        }

        this.defaultPlan = defaultPlan;
    }

    async get(id: string): Promise<PlanMapping | undefined> {
        return this.rlPlansToPlans.get(id);
    }

    async getAll(): Promise<Array<PlanMapping>> {
        return Array.from(this.rlPlansToPlans.values());
    }

    async getByBillingId(billingId: string) : Promise<PlanMapping | undefined> {
        // First, try to lookup by the exact billingId property of the mappings
        const directMatch = this.billingPlanstoPlans.get(billingId);
        if (directMatch) {
            return directMatch;
        }

        // If we don't find a direct match, search the equivalentBillingIds
        return this.equivalentBillingPlanstoPlans.get(billingId);
    }

    async getDefault(): Promise<PlanMapping | undefined> {
        return this.defaultPlan;
    }
}
