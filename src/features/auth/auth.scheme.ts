import { ProgramType, Role } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(3)
    .regex(/^[A-Za-z\s]+$/, "Name can only contain letters and spaces"),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum([Role.ADMIN, Role.MEMBER]).optional(),
  address: z.string().optional(),
  programType: z
    .enum([
      ProgramType.MARKETING,
      ProgramType.OPERASIONAL,
      ProgramType.KEUANGAN,
    ])
    .optional(),
});
