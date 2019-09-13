import {Request, Response} from "express";
import Ajv from "ajv";
import {IAccountsController} from "../controllers/AccountsController";
import {AccountAuthObject, AccountUpdateRequest, PaymentMethodCreateRequest} from "../http/HttpTypes";

export class AccountsReceiver {
    private readonly c : IAccountsController;
    constructor(c : IAccountsController) {
        this.c = c;
    }

    acctCreate = async (req: Request, res: Response) => {
        // validate
        const ajv = new Ajv();
        const valid = ajv.validate(
            {
                type: 'object',
                properties: {
                    userId: {type: 'string', minLength: 1},
                    routerPairingCode: {type: 'string', minLength: 1}
                },
                required: ['userId'],
                additionalProperties: false
            },
            req.body
        );

        if (!valid) {
            res.sendStatus(400);
            return;
        }

        let result;
        try {
            result = await this.c.accountCreation(req.body);
        } catch(e) {
            res.sendStatus(500);
            return;
        }

        res.status(201);
        res.json(result);
    };

    acctGet = async (req: Request, res: Response) => {
        const accountId = res.locals.auth ? (res.locals.auth as AccountAuthObject).accountId : undefined;
        if (accountId !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        let result;
        try {
            result = await this.c.accountGet(res.locals.account);
        } catch(e) {
            res.sendStatus(500);
            return;
        }

        res.status(200);
        res.json(result);
    };

    acctUpdate = async (req: Request, res: Response) => {
        const accountId = res.locals.auth ? (res.locals.auth as AccountAuthObject).accountId : undefined;
        if (accountId !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        // Validate request
        const ajv = new Ajv();
        const valid = ajv.validate(
            {
                type: "object",
                oneOf: [
                    {
                        properties: {
                            active: {enum: [false]}
                        },
                        required: ['active'],
                        additionalProperties: false
                    },
                    {
                        properties: {
                            active: {enum: [true]},
                            planId: {type: 'string', minLength: 1}
                        },
                        additionalProperties: false
                    }
                ]
            },
            req.body
        );
        if (!valid) {
            res.sendStatus(400);
            return;
        }

        const request : AccountUpdateRequest = req.body as AccountUpdateRequest;
        try {
            await this.c.accountUpdate(accountId, request);
        } catch(e) {
            res.sendStatus(500);
            return;
        }

        res.sendStatus(204);
    };

    acctListPaymentMethods = async(req: Request, res: Response) => {
        const accountId = res.locals.auth ? (res.locals.auth as AccountAuthObject).accountId : undefined;
        if (accountId !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        let methods;
        try {
            methods = await this.c.accountPaymentMethodsList(accountId);
        } catch(e) {
            res.sendStatus(500);
            return;
        }

        // TODO implement pagination as specified in api docs
        res.status(200);
        res.json({
            hasMore: false,
            lastEvaluatedKey: methods.length ? methods[methods.length - 1].id : undefined,
            data : methods
        });
    };

    acctCreatePaymentMethod = async (req: Request, res: Response) => {
        if (!req.body.token) {
            res.sendStatus(400);
            return;
        }
        const request = req.body as PaymentMethodCreateRequest;

        const accountId = res.locals.auth ? (res.locals.auth as AccountAuthObject).accountId : undefined;
        if (accountId !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        let result;
        try {
            result = await this.c.accountPaymentMethodCreation(accountId, request);
        } catch(e) {
            res.sendStatus(500);
            return;
        }

        res.status(201);
        res.json(result);
    };

    acctDeletePaymentMethod = async (req: Request, res: Response) => {
        const accountId = res.locals.auth ? (res.locals.auth as AccountAuthObject).accountId : undefined;
        if (accountId !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        try {
            await this.c.accountPaymentMethodDelete(accountId, req.params.methodId);
        } catch(e) {
            res.sendStatus(500);
            return;
        }

        res.sendStatus(204);
    };

    acctSetDefaultPaymentMethod = async (req: Request, res: Response) => {
        const accountId = res.locals.auth ? (res.locals.auth as AccountAuthObject).accountId : undefined;
        if (accountId !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        try {
            await this.c.accountPaymentMethodSetDefault(accountId, req.params.methodId);
        } catch(e) {
            res.sendStatus(500);
            return;
        }
        res.sendStatus(204);
    }
}
