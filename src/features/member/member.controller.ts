import type { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import supabase from "../../lib/supabase.js";

export const getAllActivityProgram = async (req: Request, res: Response) => {
  const user = req.user!;

  try {
    const activity = await prisma.activityProgram.findMany({
      where: { userId: user.id },
      include: {
        MediaActivity: true,
      },
    });

    res.status(200).json({ activity });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getActivityProgram = async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const user = req.user!;

  if (!activityId || !user) {
    res.status(400).json({ message: "Activity ID or user is missing" });
    return;
  }

  try {
    const activity = await prisma.activityProgram.findUnique({
      where: { id: activityId },
      include: {
        MediaActivity: true,
      },
    });

    if (!activity) {
      res.status(404).json({ message: "Activity not found" });
      return;
    }

    if (activity.userId !== user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    res.status(200).json({ activity });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const addActivityProgram = async (req: Request, res: Response) => {
  const { title, description } = req.body;
  const user = req.user!;

  try {
    const activity = await prisma.activityProgram.create({
      data: {
        title,
        description,
        userId: user.id,
        time: new Date(),
      },
      select: { id: true },
    });

    res
      .status(200)
      .json({ message: "Activity program created", activityId: activity.id });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const addActivityMedia = async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const files = req.files as Express.Multer.File[] | undefined;
  const user = req.user!;

  if (!activityId || !user) {
    res.status(400).json({ message: "Activity ID or user is missing" });
    return;
  }

  const activity = await prisma.activityProgram.findUnique({
    where: { id: activityId },
    select: { userId: true },
  });

  if (!activity) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  if (activity.userId !== user.id) {
    res.status(403).json({
      message:
        "Forbidden: You do not have permission to add media to this activity.",
    });
    return;
  }

  if (!files || files.length === 0) {
    res.status(400).json({ message: "No media files uploaded" });
    return;
  }

  try {
    const uploadAndDbPromises = files.map(async (file, index) => {
      if (!file) {
        return null;
      }

      const fileName = `${Date.now()}-${file.originalname}`;

      const { error: uploadError } = await supabase.storage
        .from("activity-media")
        .upload(`${fileName}`, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return null;
      }

      const publicUrl = supabase.storage
        .from("activity-media")
        .getPublicUrl(`${fileName}`).data.publicUrl;

      return prisma.mediaActivity.create({
        data: {
          mediaUrl: publicUrl!,
          type: file.mimetype,
          format: fileName.split(".").pop()!,
          size: file.size,
          order: index,
          activityProgramId: activityId,
        },
      });
    });

    const results = await Promise.all(uploadAndDbPromises);
    const successfullyAdded = results.filter(Boolean);

    if (successfullyAdded.length === 0) {
      res.status(500).json({ message: "Failed to upload any media files." });
      return;
    }

    res.status(200).json({
      message: "Media uploaded successfully",
      count: successfullyAdded.length,
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateActivityProgram = async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const { title, description } = req.body;
  const user = req.user!;

  if (!activityId || !user) {
    res.status(400).json({ message: "Activity ID or user is missing" });
    return;
  }

  const activity = await prisma.activityProgram.findUnique({
    where: { id: activityId },
    select: { id: true, userId: true, status: true },
  });

  if (!activity) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  if (activity.userId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  if (activity.status !== "CANCELED") {
    res.status(400).json({ message: "Activity is not in Canceled status" });
    return;
  }

  try {
    await prisma.activityProgram.update({
      where: { id: activityId },
      data: {
        title,
        description,
      },
    });

    res.status(200).json({
      message: "Activity text updated successfully",
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateActivityMedia = async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const { mediaIdsToDelete } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  const user = req.user!;

  let normalizedMediaIds: string[] = [];

  if (mediaIdsToDelete) {
    if (Array.isArray(mediaIdsToDelete)) {
      normalizedMediaIds = mediaIdsToDelete;
    } else if (typeof mediaIdsToDelete === "string") {
      normalizedMediaIds = [mediaIdsToDelete];
    }
  }

  if (!activityId || !user) {
    res.status(400).json({ message: "Activity ID or user is missing" });
    return;
  }

  const activity = await prisma.activityProgram.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      userId: true,
      status: true,
    },
  });

  if (!activity) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  if (activity.userId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  if (activity.status !== "CANCELED") {
    res.status(400).json({ message: "Activity is not in Canceled status" });
    return;
  }

  try {
    let deletedMediaCount = 0;
    let addedMediaCount = 0;

    if (normalizedMediaIds.length > 0) {
      const mediaToDelete = await prisma.mediaActivity.findMany({
        where: {
          id: { in: normalizedMediaIds },
          activityProgramId: activityId,
        },
        select: { mediaUrl: true },
      });

      const fileNamesToDelete = mediaToDelete
        .map((m) => {
          const fileName = m.mediaUrl.split("/").pop();
          return fileName ? decodeURIComponent(fileName) : null;
        })
        .filter(Boolean) as string[];

      if (fileNamesToDelete.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("activity-media")
          .remove(fileNamesToDelete);

        if (removeError) {
          console.error("Supabase remove error:", removeError);
        }
      }

      const deletedResult = await prisma.mediaActivity.deleteMany({
        where: { id: { in: normalizedMediaIds } },
      });
      deletedMediaCount = deletedResult.count;
    }

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file, index) => {
        const fileName = `${Date.now()}-${file.originalname}`;

        const { error: uploadError } = await supabase.storage
          .from("activity-media")
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
          });

        if (uploadError) {
          console.error("Supabase upload error:", uploadError);
          return null;
        }

        const { data: publicUrlData } = supabase.storage
          .from("activity-media")
          .getPublicUrl(fileName);

        return prisma.mediaActivity.create({
          data: {
            mediaUrl: publicUrlData.publicUrl,
            type: file.mimetype,
            format: file.originalname.split(".").pop()!,
            size: file.size,
            order: index,
            activityProgramId: activityId,
          },
          select: { id: true },
        });
      });

      const addedResults = await Promise.all(uploadPromises);
      addedMediaCount = addedResults.filter(Boolean).length;
    }

    res.status(200).json({
      message: "Media updated successfully",
      deletedMediaCount: deletedMediaCount,
      addedMediaCount: addedMediaCount,
    });
  } catch (error) {
    console.error("Update media error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteActivity = async (req: Request, res: Response) => {
  const { activityId } = req.params;
  const user = req.user!;

  if (!activityId) {
    res.status(400).json({ message: "Activity ID is required" });
    return;
  }

  const activity = await prisma.activityProgram.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      status: true,
      userId: true,
      MediaActivity: {
        select: {
          id: true,
          mediaUrl: true,
        },
      },
    },
  });

  if (!activity) {
    res.status(404).json({ message: "Activity not found" });
    return;
  }

  if (activity.userId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  if (activity.status !== "CANCELED") {
    res
      .status(400)
      .json({ message: "Only canceled activities can be deleted" });
    return;
  }

  const mediaResults = await Promise.all(
    activity.MediaActivity.map(async (m) => {
      const fileName = decodeURIComponent(m.mediaUrl.split("/").pop()!);

      try {
        await supabase.storage.from("activity-media").remove([fileName]);

        await prisma.mediaActivity.delete({ where: { id: m.id } });

        return { mediaId: m.id, success: true };
      } catch (err) {
        return { mediaId: m.id, success: false };
      }
    })
  );

  await prisma.activityProgram.delete({ where: { id: activityId } });

  res.status(200).json({
    message: "Activity and all media deleted",
    mediaResults,
  });
};
