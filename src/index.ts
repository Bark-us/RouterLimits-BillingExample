import express from "express";

import * as baseController from "./controllers/base";
import * as rlWebhookController from "./controllers/routerlimitswebhooks";
import * as billingWebhookController from "./controllers/billingwebhooks";

const app = express();

app.get('/', baseController.index);
app.post('/webhooks/routerlimits', rlWebhookController.router);
app.post('/webhooks/billing', billingWebhookController.router);

app.listen(8080);
