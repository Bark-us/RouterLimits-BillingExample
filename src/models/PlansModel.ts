import {PlanMapping} from "../Config";

export interface IPlansModel {
    /**
     * Get plan info by Router Limits id
     * @param id Router Limits id of the plan
     */
    get(id : string) : Promise<PlanMapping | undefined>;

    getAll() : Promise<Array<PlanMapping>>;
}

export class PlansModel implements IPlansModel {
    private readonly rlPlansToBillingPlans : Map<String, PlanMapping>;

    constructor(plans : Array<PlanMapping>) {
        this.rlPlansToBillingPlans = new Map();
        plans.forEach((p) => {
            this.rlPlansToBillingPlans.set(p.id, p);
        })
    }

    get(id: string): Promise<PlanMapping | undefined> {
        const p = this.rlPlansToBillingPlans.get(id);

        return Promise.resolve(p);
    }

    async getAll(): Promise<Array<PlanMapping>> {
        return Array.from(this.rlPlansToBillingPlans.values());
    }
}
