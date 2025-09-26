import express, { type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./features/auth/auth.routes.js";
import memberRoutes from "./features/member/member.routes.js";
import "dotenv/config";
import { authorize } from "./middleware/authorize.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://koperasi-khl.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/member", authorize(["MEMBER"]), memberRoutes);
app.use("/api/admin", authorize(["ADMIN"]), memberRoutes);

app.use((_, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
