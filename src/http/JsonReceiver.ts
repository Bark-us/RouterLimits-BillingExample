import {Request, Response} from "express";

export type JsonType = object | string | number | JsonArray;
interface JsonArray extends Array<JsonType> {}

export type JsonRequestHandler = (pathParams : any, queryParams : any, body : any) => Promise<{body? : JsonType, status? : number, headers? : object}>;

export class JsonReceiver {
    private readonly handler : JsonRequestHandler;
    constructor(handler : JsonRequestHandler) {
        this.handler = handler;
    }

    public readonly process = (req: Request, res: Response) : void => {
        this.handler(req.params, req.query, req.body).then((result) => {
            res.set(result.headers || {});
            res.status(result.status || (result.body ? 200 : 204));
            if (result.body) {
                res.json(result.body);
            }
            else {
                res.send();
            }
        }).catch((err) => {
            res.status(500);
            res.send();
        });
    };
}
