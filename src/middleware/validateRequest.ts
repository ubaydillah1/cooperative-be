import type { NextFunction, Request, Response } from "express";

export const validateRequest = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      if (!req.body[field]) {
        res.status(400).json({ message: `All fields are required` });
        return;
      }
    }
    next();
  };
};
