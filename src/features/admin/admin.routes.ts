import { Router } from "express";
import * as AdminController from "./admin.controller.js";
import upload from "../../lib/multer.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = Router();

// Members
router.get("/members", AdminController.getMembers);

router.patch(
  "/members/:userId",
  validateRequest(["status"]),
  AdminController.updateStatusMember
);

// Organization
router.post(
  "/organization-structure",
  upload.single("image"),
  AdminController.addStructureOrganization
);

router.put(
  "/organization-structure/:organizationStructureId",
  upload.single("image"),
  AdminController.editStructureOrganization
);

router.delete(
  "/organization-structure/:organizationStructureId",
  upload.single("image"),
  AdminController.deleteStructureOrganization
);

// Activity Program
router.get("/activity-program", AdminController.getActivityPrograms);

router.patch(
  "/activity-program/:activityProgramId",
  validateRequest(["status"]),
  AdminController.updateStatusActivityProgram
);
export default router;
