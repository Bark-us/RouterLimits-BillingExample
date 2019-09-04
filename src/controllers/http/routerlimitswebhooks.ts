import crypto from "crypto";
import {ExpireSet} from "../../ExpireSet";
import {Request, Response} from "express";
import {
    RLAccountCanceledWebhookData,
    RLAccountCreatedWebhookData,
    RLAccountSubscribedWebhookData,
    Webhook,
    WebhookType
} from "../../routerlimits/webhooks";
import {Configuration} from "../../Config";
import {IRouterLimitsController} from "../RouterLimitsController";

const signatureHeaderName = "x-rl-signatures";

export class RouterLimitsWebhookController {
    public readonly router = (req: Request, res: Response) => {
        // Validate webhook signature
        const sigHeader = req.header(signatureHeaderName);
        if (!sigHeader) {
            return res.status(400).send("Missing signature");
        }

        const signatures = sigHeader.split(",");
        const expectedSignature = crypto.createHmac("sha256", this.config.routerlimits.sharedSecret).update(req.body).digest().toString('hex');
        const validSig = signatures.some((sig) => {return sig === expectedSignature});
        if (!validSig) {
            return res.status(400).send("Invalid signature");
        }

        // Parse JSON (we take in a raw buffer instead of allowing Express to parse the json because we need to do the
        // signature validation above).
        let parsedBody;
        try {
            parsedBody = JSON.parse(req.body);
        }
        catch (e) {
            return res.status(400).send("Invalid JSON");
        }

        // Validate webhook format
        let webhook : Webhook;
        try {
            webhook = Webhook.fromObj(parsedBody);
        }
        catch(e) {
            return res.status(400).send("Invalid webhook format");
        }

        // Ensure webhook attemptTimestamp is within valid period
        const now = +new Date() / 1000 | 0;
        const timeDifference = Math.abs(now - webhook.attemptTimestamp);
        if (timeDifference > this.config.routerlimits.webhookValidInterval) {
            return res.status(400).send("Invalid attemptTimestamp");
        }

        // Ensure webhook id has not been used within the valid period. If it has, we're good - no action needed
        if (this.usedIds.has(webhook.eventId)) {
            return res.sendStatus(204);
        }

        const handleSuccess = () => {
            this.usedIds.insert(webhook.eventId);
            res.sendStatus(204);
        };

        const handleFailure = (err : Error) => {
            res.sendStatus(500)
            // TODO log err;
        };

        switch(webhook.eventType) {
            case WebhookType.ACCOUNT_CREATED:
            {
                const data = webhook.data as RLAccountCreatedWebhookData;
                this.processor.handleAccountCreated(webhook.eventTimestamp, data.accountId, data.firstName, data.lastName, data.email)
                    .then(handleSuccess, handleFailure);
            }
                break;

            case WebhookType.ACCOUNT_SUBSCRIBED:
                const data = webhook.data as RLAccountSubscribedWebhookData;
                this.processor.handleAccountSubscriptionChange(webhook.eventTimestamp, data.accountId, data.plan.id)
                    .then(handleSuccess, handleFailure);
                break;

            case WebhookType.ACCOUNT_CANCELED:
                this.processor.handleAccountSubscriptionCancel(webhook.eventTimestamp, (webhook.data as RLAccountCanceledWebhookData).accountId)
                    .then(handleSuccess, handleFailure);
                break;

            default:
                res.status(400).send("Unknown webhook type");
                break;
        }
    };

    private readonly config : Configuration;
    private readonly processor : IRouterLimitsController;
    private readonly usedIds : ExpireSet<string>;

    constructor(config : Configuration, processor : IRouterLimitsController) {
        this.config = config;
        this.processor = processor;
        this.usedIds = new ExpireSet<string>(config.routerlimits.webhookValidInterval);
    }
}
