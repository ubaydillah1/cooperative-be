import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../features/auth/auth.service.js";
import type { Role } from "@prisma/client";

const authService = new AuthService();

export const authorize = (allowedRoles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.token;
      if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await authService.validateSession(token);
      if (!user) {
        res.status(401).json({ message: "Session expired" });
        return;
      }

      // await authService.extendIfNeeded(token, 30, 1);

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(500).json({ message: "Server Error" });
    }
  };
};
