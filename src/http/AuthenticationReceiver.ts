import {AuthResult, IAuthenticationController} from "../controllers/AuthenticationController";
import {Request, Response} from "express";
import {ILoggingModel, LogLevel} from "../models/LoggingModel";

export class AuthenticationReceiver {
    private readonly c : IAuthenticationController;
    private readonly log : ILoggingModel;

    constructor(c : IAuthenticationController, log : ILoggingModel) {
        this.c = c;
        this.log = log;
    }

    authViaJwt = async (req: Request, res: Response) => {
        // JWT is required
        if (!req.body || !req.body.jwt) {
            res.status(400);
            res.json("Missing JWT");
            return;
        }

        // Ask the controller
        let result;
        try {
            result = await this.c.handle(req.body.jwt);
        } catch(e) {
            this.log.log(LogLevel.ERROR, "Error authenticating", e);
            res.sendStatus(500);
            return;
        }

        switch(result.result) {
            case AuthResult.SUCCESS:
                this.log.log(LogLevel.INFO, 'Successful JWT authentication', {ip: req.ip});
                res.status(200);
                res.json(result.body);
            break;

            case AuthResult.INVALID:
                this.log.log(LogLevel.INFO, 'Invalid JWT authentication request from ${req.ip}', {ip: req.ip, reason: result.message});
                res.status(400);
                res.json(result.message);
            break;

            case AuthResult.DENIED:
                this.log.log(LogLevel.INFO, 'Rejected JWT authentication', {ip: req.ip, reason: result.message});
                res.status(401);
                res.json(result.message);
            break;
        }
    }
}
