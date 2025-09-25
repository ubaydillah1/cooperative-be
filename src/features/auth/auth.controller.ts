import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { loginSchema, registerSchema } from "./auth.scheme.js";
import { generateSessionToken } from "../../utils/token.js";
import { addHours } from "date-fns";
import { CONFIG } from "../../lib/config.js";
import { AuthService } from "./auth.service.js";

const authService = new AuthService();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({ message: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(404).json({ message: "Invalid credentials" });
      return;
    }

    const token = await authService.createSession(user.id);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: CONFIG.NODE_ENV === "production" ? "lax" : "none",
      secure: true,
    });

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      res
        .status(400)
        .json({ errors: formatted, message: "Invalid field requirement" });
    }

    res.status(500).json({ message: "Server Error" });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, address, programType } =
      registerSchema.parse(req.body);

    const existingEmail = await prisma.user.findUnique({ where: { email } });

    if (existingEmail) {
      res
        .status(409)
        .json({ message: "Email already in use", code: "EMAIL_IN_USE" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        address: address ?? null,
        programType: programType ?? null,
      },
    });

    const token = generateSessionToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: addHours(new Date(), 24),
      },
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: CONFIG.NODE_ENV === "production" ? "lax" : "none",
      secure: true,
    });

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      res
        .status(400)
        .json({ errors: formatted, message: "Invalid field requirement" });
    }

    res.status(500).json({ message: "Server Error" });
  }
};
