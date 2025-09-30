import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { loginSchema, registerSchema } from "./auth.scheme.js";
import { generateSessionToken } from "../../utils/token.js";
import { addHours } from "date-fns";
import { CONFIG } from "../../lib/config.js";
import { AuthService } from "./auth.service.js";
import supabase from "../../lib/supabase.js";

const authService = new AuthService();

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true },
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
      sameSite: "none",
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
    const { name, email, password, address, programType } =
      registerSchema.parse(req.body);

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

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
        address: address ?? null,
        programType: programType ?? null,
      },
      select: { id: true },
    });

    const token = generateSessionToken();

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: addHours(new Date(), 24),
      },
      select: { id: true },
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "none",
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

export const editAvatar = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const file = req.file as Express.Multer.File | undefined;

  if (!file) {
    res.status(400).json({ message: "Avatar is required" });
    return;
  }

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ImageProfile: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.ImageProfile) {
      await supabase.storage
        .from("avatars")
        .remove([user.ImageProfile.split("/").pop()!]);
    }

    const fileName = `${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, file.buffer);

    if (error) {
      res.status(500).json({ message: "Server Error" });
      return;
    }

    const publicUrl = supabase.storage.from("avatars").getPublicUrl(fileName)
      .data.publicUrl;

    await prisma.user.update({
      where: { id: userId },
      data: {
        ImageProfile: publicUrl,
      },
      select: { id: true },
    });

    res.status(200).json({ message: "Avatar updated successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const editIdCardPhoto = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const file = req.file as Express.Multer.File | undefined;

  if (!file) {
    res.status(400).json({ message: "Id Card Photo is required" });
    return;
  }

  if (!userId) {
    res.status(400).json({ message: "User ID is required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, idCardPhoto: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.idCardPhoto) {
      await supabase.storage
        .from("credentials")
        .remove([user.idCardPhoto.split("/").pop()!]);
    }

    const fileName = `${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
      .from("credentials")
      .upload(fileName, file.buffer);

    if (error) {
      res.status(500).json({ message: "Server Error" });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        idCardPhoto: fileName,
      },
      select: { id: true },
    });

    res.status(200).json({ message: "Id Card Photo updated successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const me = async (req: Request, res: Response) => {
  const session = req.cookies?.token;

  if (!session) {
    res.status(404).json({ message: "Token not found" });
    return;
  }

  const user = await authService.validateSession(session);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ message: "User found", data: user });
};
