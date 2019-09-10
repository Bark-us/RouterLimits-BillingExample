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
}

export class PlansModel implements IPlansModel {
    private readonly rlPlansToPlans : Map<String, PlanMapping>;
    private readonly billingPlanstoPlans : Map<string, PlanMapping>;

    constructor(plans : Array<PlanMapping>) {
        this.rlPlansToPlans = new Map();
        this.billingPlanstoPlans = new Map();

        plans.forEach((p) => {
            this.rlPlansToPlans.set(p.id, p);
            this.billingPlanstoPlans.set(p.billingId, p);
        })
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
}
