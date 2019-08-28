import { Request, Response } from "express";

export const index = (req: Request, res: Response) => {
    res.send(`You've arrived at the right place, ${req.ip}`);
};
