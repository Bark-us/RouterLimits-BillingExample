import {JsonRequestHandler} from "../http/JsonReceiver";
import {IPlansModel} from "models/PlansModel";

export interface IPlansController {
    plansList : JsonRequestHandler
}

export class PlansController implements IPlansController {
    private readonly plans : IPlansModel;

    constructor(plans : IPlansModel) {
        this.plans = plans;
    }

    plansList: JsonRequestHandler = async (pathParams, queryParams, body) => {
        // TODO implement pagination as specified in api docs

        const plans = (await this.plans.getAll()).map((p) => {
            return {
                id: p.id,
                name: p.name
            }
        });

        return {
            status: 200,
            body : {
                hasMore: false,
                lastEvaluatedKey: plans.length ? plans[plans.length - 1].id : undefined,
                data : plans
            }
        };
    }
}
