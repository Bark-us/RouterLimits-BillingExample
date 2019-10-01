import { Request, Response } from "express";
import {Configuration} from "../Config";
import Stripe from 'stripe';
import ISubscription = Stripe.subscriptions.ISubscription;
import {IBillingWebhookController} from "../controllers/BillingWebhookController";
import {ExpireSet} from "../ExpireSet";
import IEvent = Stripe.events.IEvent;

export class StripeWebhookReceiver {
    public readonly router = (req: Request, res: Response) => {
        // Validate webhook signature
        const sig = req.header("stripe-signature");

        if (!sig) {
            return res.status(400).send("Missing signature");
        }

        let event : IEvent;

        try {
            event = this.stripe.webhooks.constructEvent(req.body, sig, this.config.stripe.webhookSecret, this.config.stripe.webhookValidInterval);
        }
        catch (err) {
            return res.status(400).send("Invalid signature or event");
        }

        // Make sure we don't process events twice
        if (this.usedIds.has(event.id)) {
            return res.sendStatus(204);
        }

        // Handle events we care about
        if (event.type ==="customer.subscription.deleted") {
            if (!event.data || !event.data.object || !event.data.object) {
                return res.status(400).send("Invalid webhook format");
            }

            const obj = event.data.object as ISubscription;
            if (!obj.customer || !obj.plan || !obj.plan.id) {
                return res.status(400).send("Invalid webhook format");
            }

            // Handle it
            return this.billing.handleAccountSubscriptionCancel(event.created, typeof obj.customer === "string" ? obj.customer : obj.customer.id).then(() => {
                this.usedIds.insert(event.id);
                return res.sendStatus(204);
            }).catch((err) => {
                return res.sendStatus(500);
            })
        }
        // We don't care about other events
        else {
            return res.sendStatus(204);
        }
    };

    private readonly config : Configuration;
    private readonly stripe : Stripe;
    private readonly billing : IBillingWebhookController;
    private readonly usedIds : ExpireSet<string>;

    constructor(config : Configuration, billing : IBillingWebhookController) {
        this.config = config;
        this.stripe = new Stripe(config.stripe.secretKey, config.stripe.apiVersion);
        this.billing = billing;
        this.usedIds = new ExpireSet<string>(config.stripe.webhookValidInterval);
    }
}
