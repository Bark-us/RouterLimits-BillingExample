import { Request, Response } from "express";

export const router = (req: Request, res: Response) => {
    res.sendStatus(501);
};
