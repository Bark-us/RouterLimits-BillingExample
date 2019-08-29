import { Request, Response } from "express";
import {Configuration} from "../../Config";
import Stripe from 'stripe';
import ISubscription = Stripe.subscriptions.ISubscription;
import {IBillingController} from "../BillingController";

export class StripeWebhookController {
    public readonly router = (req: Request, res: Response) => {
        // Validate webhook signature
        const sig = req.header("stripe-signature");

        if (!sig) {
            return res.status(400).send("Missing signature");
        }

        let event;

        try {
            event = this.stripe.webhooks.constructEvent(req.body, sig, this.config.stripe.webhookSecret);
        }
        catch (err) {
            return res.status(400).send("Invalid signature or event");
        }

        // Make sure we don't process events twice

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
            // TODOD is stripe's event.created the right property? We want the time when this particular webhook attempt was created, not the time of the first attempt
            return this.billing.handleAccountSubscriptionCancel(event.created, typeof obj.customer === "string" ? obj.customer : obj.customer.id).then(() => {
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
    private readonly billing : IBillingController;

    constructor(config : Configuration, billing : IBillingController) {
        this.config = config;
        this.stripe = new Stripe(config.stripe.secretKey);
        this.billing = billing;
    }
}
