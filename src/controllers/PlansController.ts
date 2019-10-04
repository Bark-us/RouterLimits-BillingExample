import {IPlansModel} from "models/PlansModel";
import {ApiPlan} from "http/HttpTypes";

export interface IPlansController {
    plansList(startKey : string, limit: number) : Promise<Array<ApiPlan>>;
}

export class PlansController implements IPlansController {
    private readonly plans : IPlansModel;

    constructor(plans : IPlansModel) {
        this.plans = plans;
    }

    async plansList(startKey: string, limit: number): Promise<Array<ApiPlan>> {
        // TODO implement pagination as specified in api docs
        return (await this.plans.getAll()).map((p) => {
            return {
                id: p.id,
                name: p.name,
                unavailable: p.unavailable || undefined
            }
        });
    }
}
