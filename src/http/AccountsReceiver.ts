import {Request, Response} from "express";
import Ajv from "ajv";
import {Account} from "../models/AccountsModel";
import {IAccountsController} from "../controllers/AccountsController";
import {AccountUpdateRequest, PaymentMethodCreateRequest} from "../http/HttpTypes";

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

        const result = await this.c.accountCreation(req.body);
        res.status(201);
        res.json(result);
    };

    acctGet = async (req: Request, res: Response) => {
        if (!res.locals || !res.locals.account || res.locals.account.id !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }

        const result = await this.c.accountGet(res.locals.account);
        res.status(200);
        res.json(result);
    };

    acctUpdate = async (req: Request, res: Response) => {
        if (!res.locals || !res.locals.account || res.locals.account.id !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }
        const accountInfo = res.locals.account as Account;

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
        await this.c.accountUpdate(accountInfo, request);
        res.sendStatus(204);
    };

    acctListPaymentMethods = async(req: Request, res: Response) => {
        if (!res.locals || !res.locals.account || res.locals.account.id !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }
        const accountInfo = res.locals.account as Account;

        const methods = await this.c.accountPaymentMethodsList(accountInfo);
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

        if (!res.locals || !res.locals.account || res.locals.account.id !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }
        const accountInfo = res.locals.account as Account;
        const result = await this.c.accountPaymentMethodCreation(accountInfo, request);
        res.status(201);
        res.json(result);
    };

    acctDeletePaymentMethod = async (req: Request, res: Response) => {
        if (!res.locals || !res.locals.account || res.locals.account.id !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }
        const accountInfo = res.locals.account as Account;
        await this.c.accountPaymentMethodDelete(accountInfo, req.params.methodId);
        res.sendStatus(204);
    };

    acctSetDefaultPaymentMethod = async (req: Request, res: Response) => {
        if (!res.locals || !res.locals.account || res.locals.account.id !== req.params.accountId) {
            res.sendStatus(403);
            return;
        }
        const accountInfo = res.locals.account as Account;
        await this.c.accountPaymentMethodSetDefault(accountInfo, req.params.methodId);
        res.sendStatus(204);
    }
}
