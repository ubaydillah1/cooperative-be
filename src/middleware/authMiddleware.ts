import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../features/auth/auth.service.js";

const authService = new AuthService();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const user = await authService.validateSession(token);
    if (!user) return res.status(401).json({ message: "Session expired" });

    await authService.extendIfNeeded(token, 30, 1);

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
