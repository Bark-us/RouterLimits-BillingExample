import { Request, Response } from "express";

export const router = (req: Request, res: Response) => {
    // Validate webhook format
    // Validate webhook signature
    // Ensure webhook attemptTimestamp is within valid period (2 minute)
    // Ensure webhook id has not been used within the last two minutes

    // Switch on event type, and pass on to other controllers below
    res.sendStatus(501);
};

export const accountCreated = (req: Request, res: Response) => {
    // Create customer in billing system (if none exists for this account id), store mapping in local db

    res.send(`Thanks for creating an account, ${req.ip}`);
};

export const accountSubscriptionChange = (req: Request, res: Response) => {
    // Look up billing customer id based on RL account id
    // if no subscription, create one
    // if existing subscription, check if it is already subscribed to desired level
    // Update it only if needed
    res.send(`Thanks for changing your account's subscription, ${req.ip}`);
};

export const accountSubscriptionCancel = (req: Request, res: Response) => {
    // Look up billing customer id based on RL account id
    // If there is a matching subscription, cancel it
    res.send(`Thanks for canceling your account's subscription, ${req.ip}`);
};
