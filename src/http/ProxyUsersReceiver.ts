import {NextFunction, Request, Response} from "express";
import {IProxyUserController} from "../controllers/ProxyUserController";
import {ILoggingModel, LogLevel} from "../models/LoggingModel";

export class ProxyUsersReceiver {
    private controller : IProxyUserController;
    private log : ILoggingModel;

    constructor(controller : IProxyUserController, log: ILoggingModel) {
        this.controller = controller;
        this.log = log;
    }

    userCreate = async (req : Request, res: Response, next: NextFunction) => {
        let userId;

        try {
            userId = await this.controller.createUser(req.body);
        } catch(e) {
            if (e.message) {
                this.log.log(LogLevel.ERROR, "Error doing proxy user create", {message: e.message, stack: e.stack});
            }
            else if (e.response) {
                this.log.log(LogLevel.ERROR, "Error doing proxy user create", {remoteStatus: e.response.statusCode, body: e.response.body});
            }
            res.sendStatus(500);
            return;
        }

        this.log.log(LogLevel.INFO, "User created", {requestBody: req.body, userId: userId});

        res.status(201);
        res.json({
            userId : userId,
            authorizationRequired: false
        })
    }
}
