import "mocha"
import {IPlansModel, PlansModel} from "../models/PlansModel";

describe("PlansModel", () => {
   it("get", async () => {
       const id = "a";
       const name = "Plan A";
       const billingId = "b_a";

       const plans : IPlansModel = new PlansModel([{id, name, billingId, default:true}]);
       let p = await plans.get("c");
       if (p) {
           throw new Error("Didn't expect plan to exist");
       }

       p = await plans.get(id);
       if (!p || p.id !== id || p.name !== name || p.billingId !== billingId) {
           throw new Error("Wrong data");
       }

       p = await plans.getByBillingId(billingId);
       if (!p || p.id !== id || p.name !== name || p.billingId !== billingId) {
           throw new Error("Wrong data");
       }

       const all = await plans.getAll();
       if (all.length !== 1) {
           throw new Error("Wrong length");
       }
       p = all[0];
       if (!p || p.id !== id || p.name !== name || p.billingId !== billingId) {
           throw new Error("Wrong data");
       }
   })
});
