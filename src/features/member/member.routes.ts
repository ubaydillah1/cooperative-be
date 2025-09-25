import { Router } from "express";
import * as MemberController from "./member.controller.js";
import upload from "../../lib/multer.js";
import { validateRequest } from "../../middleware/validateRequest.js";

const router = Router();

router.get("/activity-program", MemberController.getAllActivityProgram);
router.get(
  "/activity-program/:activityId",
  MemberController.getActivityProgram
);

router.post(
  "/activity-program",
  validateRequest(["title", "description"]),
  MemberController.addActivityProgram
);
router.post(
  "/activity-media/:activityId",
  upload.array("files"),
  MemberController.addActivityMedia
);

router.put(
  "/activity-media/:activityId",
  upload.array("files"),
  MemberController.updateActivityMedia
);

router.put(
  "/activity-program/:activityId",
  validateRequest(["title", "description"]),
  MemberController.updateActivityProgram
);

router.delete("/activity-program/:activityId", MemberController.deleteActivity);

export default router;
