import { Request, Response } from "express";

/**
 * GET /
 * Home page.
 */
export const index = (req: Request, res: Response) => {
    res.send(`You've arrived at the right place, ${req.ip}`);
};
