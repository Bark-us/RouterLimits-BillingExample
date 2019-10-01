/*
The types in this file are for deserializing Webhook calls from Router Limits.
Some of these webhooks send more data than is exposed here - these classes can be extended to parse it if needed.
The deserialization could probably be improved.
 */

export class RLAccountCreatedWebhookData {
    readonly accountId: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;

    static fromObj(obj : any) : RLAccountCreatedWebhookData {
        if (typeof obj["id"] === "string" && typeof obj["user"] === "object" && obj.user.firstName && obj.user.lastName && obj.user.email)
            return new RLAccountCreatedWebhookData(obj["id"], obj.user.firstName, obj.user.lastName, obj.user.email);
        throw new Error("Invalid object");
    }

    constructor(accountId : string, firstName : string, lastName : string, email : string) {
        this.accountId = accountId;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
    }
}

export class RLAccountCanceledWebhookData {
    readonly accountId: string;

    static fromObj(obj : any) : RLAccountCanceledWebhookData {
        if (typeof obj["accountId"] === "string")
            return new RLAccountCanceledWebhookData(obj["accountId"]);
        throw new Error("Invalid object");
    }

    constructor(accountId : string) {
        this.accountId = accountId;
    }
}

export class RLAccountSubscribedWebhookData {
    readonly accountId: string;
    readonly plan : RLPlan;

    static fromObj(obj : any) : RLAccountSubscribedWebhookData {
        if (typeof obj["accountId"] === "string" && obj["plan"])
            return new RLAccountSubscribedWebhookData(obj["accountId"], RLPlan.fromObj(obj["plan"]));
        throw new Error("Invalid object");
    }

    constructor(accountId : string, plan: RLPlan) {
        this.accountId = accountId;
        this.plan = plan;
    }
}

export class RLPlan {
    readonly id : string;
    readonly name : string;

    static fromObj(obj : any) : RLPlan {
        if (typeof obj["id"] === "string" && typeof obj["name"] === "string")
            return new RLPlan(obj["id"], obj["name"]);
        throw new Error("Invalid object");
    }

    constructor(id : string, name : string) {
        this.id = id;
        this.name = name;
    }
}

type RLWebhookData = RLAccountCreatedWebhookData | RLAccountCanceledWebhookData | RLAccountSubscribedWebhookData;

export class Webhook {
    readonly attempt : number;
    readonly attemptTimestamp : number;
    readonly data : RLWebhookData;
    readonly eventId : string;
    readonly eventTimestamp : number;
    readonly eventType : WebhookType;

    static fromObj(obj : any) : Webhook {
        if (typeof obj["attempt"] === "number"
            && typeof obj["attemptTimestamp"] === "number"
            && obj["data"]
            && typeof obj["eventId"] === "string"
            && typeof obj["eventTimestamp"] === "number"
            && typeof obj["eventType"] === "string"
        ) {
            const eventType = (() => {
                const s = obj["eventType"];
                const type = [WebhookType.ACCOUNT_CREATED, WebhookType.ACCOUNT_SUBSCRIBED, WebhookType.ACCOUNT_CANCELED].find((t) => {
                    return t === s;
                });

                if (type)
                    return type;

                throw new Error("Invalid webhook type");
            })();

            const data = (() => {
                let data : RLWebhookData;
                if (eventType === WebhookType.ACCOUNT_CREATED) {
                    data = RLAccountCreatedWebhookData.fromObj(obj["data"]);
                }
                else if (eventType === WebhookType.ACCOUNT_SUBSCRIBED) {
                    data = RLAccountSubscribedWebhookData.fromObj(obj["data"]);
                }
                else if (eventType === WebhookType.ACCOUNT_CANCELED) {
                    data = RLAccountCanceledWebhookData.fromObj(obj["data"]);
                }
                else {
                    throw new Error("Unknown webhook data type");
                }

                return data;
            })();

            return new Webhook(obj["attempt"], obj["attemptTimestamp"], data, obj["eventId"], obj["eventTimestamp"], eventType);
        }
        throw new Error("Invalid object");
    }

    constructor(attempt : number,
                attemptTimestamp : number,
                data : RLWebhookData,
                eventId : string,
                eventTimestamp : number,
                eventType : WebhookType
                ) {
        this.attempt = attempt;
        this.attemptTimestamp = attemptTimestamp;
        this.data = data;
        this.eventId = eventId;
        this.eventTimestamp = eventTimestamp;
        this.eventType = eventType;
    }
}

export enum WebhookType {
    ACCOUNT_CREATED = "ACCOUNT_CREATED",
    ACCOUNT_SUBSCRIBED = "ACCOUNT_SUBSCRIBED",
    ACCOUNT_CANCELED = "ACCOUNT_CANCELED"
}
