import {AuthResult, IAuthenticationController} from "../controllers/AuthenticationController";
import {Request, Response} from "express";

export class AuthenticationReceiver {
    private readonly c : IAuthenticationController;

    constructor(c : IAuthenticationController) {
        this.c = c;
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
            res.sendStatus(500);
            return;
        }

        switch(result.result) {
            case AuthResult.SUCCESS:
                res.status(200);
                res.json(result.body);
            break;

            case AuthResult.INVALID:
                res.status(400);
                res.json(result.message);
            break;

            case AuthResult.DENIED:
                res.status(401);
                res.json(result.message);
            break;
        }
    }
}
