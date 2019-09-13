import {PlanMapping} from "../Config";

export interface IPlansModel {
    /**
     * Get plan info by Router Limits id
     * @param id Router Limits id of the plan
     */
    get(id : string) : Promise<PlanMapping | undefined>;

    getAll() : Promise<Array<PlanMapping>>;

    /**
     * Get plan info by billing system id
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
    private readonly defaultPlan : PlanMapping;

    constructor(plans : Array<PlanMapping>) {
        this.rlPlansToPlans = new Map();
        this.billingPlanstoPlans = new Map();

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
        return this.billingPlanstoPlans.get(billingId);
    }

    async getDefault(): Promise<PlanMapping | undefined> {
        return this.defaultPlan;
    }
}
