export interface IPlansModel {
    /**
     * Get plan info by Router Limits id
     * @param id Router Limits id of the plan
     */
    get(id : string) : Promise<Plan | undefined>;
}

export interface Plan {
    /**
     * Router Limits plan id
     */
    id : string;

    /**
     * Billing system plan id
     */
    billingId : string;
}

export class PlansModel implements IPlansModel {
    private readonly rlPlansToBillingPlans : Map<String, Plan>;

    constructor(plans : Array<Plan>) {
        this.rlPlansToBillingPlans = new Map();
        plans.forEach((p) => {
            this.rlPlansToBillingPlans.set(p.id, p);
        })
    }

    get(id: string): Promise<Plan | undefined> {
        const p = this.rlPlansToBillingPlans.get(id);

        return Promise.resolve(p);
    }
}
