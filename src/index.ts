import express, { type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./features/auth/auth.routes.js";
import memberRoutes from "./features/member/member.routes.js";
import adminRoutes from "./features/admin/admin.routes.js";
import freeRoutes from "./features/free/free.routes.js";
import "dotenv/config";
import { authorize } from "./middleware/authorize.js";
import prisma from "./lib/prisma.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://koperasi-khl.vercel.app",
      "https://kayari.id",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/member", authorize(["MEMBER"]), memberRoutes);
app.use("/api/admin", authorize(["ADMIN"]), adminRoutes);
app.use("/api/free", freeRoutes);

app.get("/users", async (_, res) => {
  const user = await prisma.user.findMany();

  res.send(user);
});

app.get("/organization-structure", async (_, res) => {
  const organizationStructure = await prisma.organizationStructure.findMany();

  res.send(organizationStructure);
});

app.get("/news", async (_, res) => {
  const news = await prisma.news.findMany({
    include: {
      MediaNews: true,
    },
  });

  res.send(news);
});

app.get("/activity-program", async (_, res) => {
  const activityProgram = await prisma.activityProgram.findMany({
    include: {
      MediaActivity: true,
    },
  });

  res.send(activityProgram);
});

app.use((_, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
