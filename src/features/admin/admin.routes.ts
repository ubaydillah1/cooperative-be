import { Router } from "express";
import * as AdminController from "./admin.controller.js";
import upload from "../../lib/multer.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = Router();

// Members
router.get("/members", AdminController.getMembers);
router.post("/member", AdminController.createMember);
router.delete("/member/:userId", AdminController.deleteMember);

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

// News
router.get("/news", AdminController.getNews);
router.get("/news/:newsId", AdminController.getNewsById);

router.post(
  "/news",
  validateRequest(["title", "description", "programType"]),
  AdminController.addNews
);

router.post(
  "/news-media/:newsId",
  upload.array("files"),
  AdminController.addNewsMedia
);

router.put(
  "/news/:newsId",
  validateRequest(["title", "description", "programType"]),
  AdminController.updateNews
);

router.put(
  "/news-media/:newsId",
  upload.array("files"),
  AdminController.updateNewsMedia
);

router.delete("/news/:newsId", AdminController.deleteNews);

export default router;
