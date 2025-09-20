import express, { type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./features/auth/auth.routes.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRoutes);

app.use((req, res: Response) => {
  res.status(404).json({ message: "Not Found" });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
