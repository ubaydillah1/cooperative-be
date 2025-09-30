import { Router } from "express";
import * as AuthController from "./auth.controller.js";
import upload from "../../lib/multer.js";

const router = Router();

router.get("/me", AuthController.me);

router.post("/login", AuthController.login);
router.post("/register", AuthController.register);
router.delete("/logout", AuthController.logout);

router.put(
  "/edit-avatar/:id",
  upload.single("avatar"),
  AuthController.editAvatar
);
router.put(
  "/edit-id-card-photo/:id",
  upload.single("idCardPhoto"),
  AuthController.editIdCardPhoto
);

export default router;
