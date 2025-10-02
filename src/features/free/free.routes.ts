import { Router } from "express";
import * as FreeController from "./free.controller.js";

const router = Router();

router.get(
  "/organization-structures",
  FreeController.getAllStructureOrganization
);

export default router;
