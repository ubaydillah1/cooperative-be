import type { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { OrganizationPosition, ProgramType, Status } from "@prisma/client";
import supabase from "../../lib/supabase.js";
import { registerSchema } from "../auth/auth.scheme.js";
import bcrypt from "bcrypt";

export const getAllStructureOrganization = async (
  _: Request,
  res: Response
) => {
  try {
    const structureOrganization = await prisma.organizationStructure.findMany({
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        name: true,
        mediaUrl: true,
        order: true,
        position: true,
      },
    });

    res.json({
      message: "Structure organization found",
      data: structureOrganization,
      count: structureOrganization.length,
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const addStructureOrganization = async (req: Request, res: Response) => {
  try {
    const { position, name, order } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    if (!name || !order || !position) {
      res
        .status(400)
        .json({ message: "Name, Order, and Position are all required." });
      return;
    }

    if (!file) {
      res.status(400).json({ message: "Image is required" });
      return;
    }

    if (!(position in OrganizationPosition)) {
      res.status(400).json({ message: "Position is not Match" });
      return;
    }

    const fileName = `${Date.now()}-${file.originalname}`;

    const { error } = await supabase.storage
      .from("organization-images")
      .upload(fileName, file.buffer);

    if (error) {
      res.status(500).json({ message: "Supabase Error" });
      return;
    }

    const publicUrl = supabase.storage
      .from("organization-images")
      .getPublicUrl(fileName).data.publicUrl;

    await prisma.organizationStructure.create({
      data: {
        position,
        name,
        order: Number(order),
        mediaUrl: publicUrl,
      },
      select: {
        id: true,
      },
    });

    res.status(201).json({
      message: "Structure organization added successfully",
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const editStructureOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const { organizationStructureId } = req.params;
    const { position, name, order } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    if (!organizationStructureId) {
      res
        .status(400)
        .json({ message: "Organization Structure ID is required" });
      return;
    }

    const positionValue = position as OrganizationPosition;

    if (!(positionValue in OrganizationPosition)) {
      res.status(400).json({ message: "Position is not Match" });
      return;
    }

    if (!file) {
      await prisma.organizationStructure.update({
        where: { id: organizationStructureId },
        data: {
          position: positionValue,
          name,
          order: Number(order),
        },
        select: {
          id: true,
        },
      });
    }

    if (file) {
      const organizationStructure =
        await prisma.organizationStructure.findUnique({
          where: { id: organizationStructureId },
          select: { mediaUrl: true },
        });

      if (organizationStructure?.mediaUrl) {
        await supabase.storage
          .from("organization-images")
          .remove([
            decodeURIComponent(
              organizationStructure.mediaUrl.split("/").pop()!
            ),
          ]);
      }

      const fileName = `${Date.now()}-${file.originalname}`;

      const { error } = await supabase.storage
        .from("organization-images")
        .upload(fileName, file.buffer);

      if (error) {
        res.status(500).json({ message: "Supabase Error" });
        return;
      }

      const publicUrl = supabase.storage
        .from("organization-images")
        .getPublicUrl(fileName).data.publicUrl;

      await prisma.organizationStructure.update({
        where: { id: organizationStructureId },
        data: {
          position: positionValue,
          name,
          order: Number(order),
          mediaUrl: publicUrl,
        },
        select: {
          id: true,
        },
      });
    }

    res.status(200).json({
      message: "Structure organization updated successfully",
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteStructureOrganization = async (
  req: Request,
  res: Response
) => {
  try {
    const { organizationStructureId } = req.params;

    if (!organizationStructureId) {
      res
        .status(400)
        .json({ message: "Organization Structure ID is required" });
      return;
    }

    const organizationStructure = await prisma.organizationStructure.delete({
      where: { id: organizationStructureId },
      select: {
        mediaUrl: true,
      },
    });

    if (!organizationStructure) {
      res.status(404).json({ message: "Organization Structure not found" });
      return;
    }

    if (organizationStructure.mediaUrl) {
      try {
        await supabase.storage
          .from("organization-images")
          .remove([
            decodeURIComponent(
              organizationStructure.mediaUrl.split("/").pop()!
            ),
          ]);
      } catch {
        res.status(500).json({ message: "Supabase Error" });
        return;
      }
    }

    res.status(200).json({
      message: "Structure organization deleted successfully",
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getMembers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        where: { role: "MEMBER" },
        select: {
          id: true,
          name: true,
          email: true,
          address: true,
          ImageProfile: true,
          createdAt: true,
          programType: true,
        },
      }),
      prisma.user.count({ where: { role: "MEMBER" } }),
    ]);

    res.status(200).json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateStatusMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    if (!(status in Status)) {
      res.status(400).json({ message: "Status is not Match" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        status,
      },
    });

    res.status(200).json({ message: "Status updated" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getActivityPrograms = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const [activityPrograms, total] = await Promise.all([
      prisma.activityProgram.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          time: true,
          User: {
            select: {
              name: true,
              email: true,
            },
          },
          status: true,
          description: true,
          createdAt: true,
        },
      }),
      prisma.activityProgram.count(),
    ]);

    res.status(200).json({
      data: activityPrograms,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateStatusActivityProgram = async (
  req: Request,
  res: Response
) => {
  try {
    const { activityProgramId } = req.params;
    const { status } = req.body;

    if (!activityProgramId) {
      res.status(400).json({ message: "Activity Program ID is required" });
      return;
    }

    if (!(status in Status)) {
      res.status(400).json({ message: "Status is not Match" });
      return;
    }

    const activityProgram = await prisma.activityProgram.findUnique({
      where: { id: activityProgramId },
      select: { id: true },
    });

    if (!activityProgram) {
      res.status(404).json({ message: "Activity Program not found" });
      return;
    }

    await prisma.activityProgram.update({
      where: {
        id: activityProgramId,
      },
      data: {
        status,
      },
    });

    res.status(200).json({ message: "Status updated" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const createMember = async (req: Request, res: Response) => {
  try {
    const { name, email, password, address, programType } =
      registerSchema.parse(req.body);

    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      res
        .status(409)
        .json({ message: "Email already in use", code: "EMAIL_IN_USE" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        address: address ?? null,
        programType,
      },
      select: { id: true },
    });

    res.status(200).json({ message: "Member created" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        idCardPhoto: true,
        ImageProfile: true,
        ActivityProgram: {
          select: { MediaActivity: { select: { mediaUrl: true } } },
        },
        News: {
          select: { MediaNews: { select: { mediaUrl: true } } },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const deletePromises: Promise<any>[] = [];

    if (user.idCardPhoto) {
      deletePromises.push(
        supabase.storage
          .from("credentials")
          .remove([user.idCardPhoto])
          .then(({ error }) => {
            if (error)
              console.error("Delete idCardPhoto error:", error.message);
          })
      );
    }

    if (user.ImageProfile) {
      const key = decodeURIComponent(user.ImageProfile.split("/").pop()!);
      deletePromises.push(
        supabase.storage
          .from("avatars")
          .remove([key])
          .then(({ error }) => {
            if (error)
              console.error("Delete ImageProfile error:", error.message);
          })
      );
    }

    deletePromises.push(
      ...user.ActivityProgram.flatMap((ap) =>
        ap.MediaActivity.map((m) => {
          const key = decodeURIComponent(m.mediaUrl.split("/").pop()!);
          return supabase.storage
            .from("activity-media")
            .remove([key])
            .then(({ error }) => {
              if (error)
                console.error("Delete MediaActivity error:", error.message);
            });
        })
      )
    );

    deletePromises.push(
      ...user.News.flatMap((n) =>
        n.MediaNews.map((m) => {
          const key = decodeURIComponent(m.mediaUrl.split("/").pop()!);
          return supabase.storage
            .from("organization-images")
            .remove([key])
            .then(({ error }) => {
              if (error)
                console.error("Delete MediaNews error:", error.message);
            });
        })
      )
    );

    await Promise.all(deletePromises);

    await prisma.user.delete({ where: { id: userId } });

    return res.status(200).json({ message: "Member deleted successfully" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const getNews = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const [news, total] = await Promise.all([
      prisma.news.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          subtitle: true,
          description: true,
          MediaNews: {
            select: {
              id: true,
              mediaUrl: true,
            },
          },
        },
      }),
      prisma.news.count(),
    ]);

    res.status(200).json({
      data: news,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getNewsById = async (req: Request, res: Response) => {
  const { newsId } = req.params;

  if (!newsId) {
    res.status(400).json({ message: "News ID is required" });
    return;
  }

  try {
    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        MediaNews: {
          select: {
            id: true,
            mediaUrl: true,
            type: true,
            format: true,
            size: true,
            order: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            ImageProfile: true,
          },
        },
      },
    });

    if (!news) {
      res.status(404).json({ message: "News not found" });
      return;
    }

    res.status(200).json({ data: news });
  } catch (e) {
    console.error("Get news by ID error:", e);
    res.status(500).json({ message: "Server Error" });
  }
};

export const addNews = async (req: Request, res: Response) => {
  const { title, subtitle, description, programType } = req.body;
  const user = req.user!;

  if (!Object.values(ProgramType).includes(programType)) {
    res.status(400).json({ message: "Invalid program type" });
    return;
  }

  try {
    const news = await prisma.news.create({
      data: {
        title,
        subtitle,
        description,
        userId: user.id,
        programType,
      },
      select: { id: true },
    });

    res.status(200).json({ message: "News created", data: news });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const addNewsMedia = async (req: Request, res: Response) => {
  const { newsId } = req.params;
  const files = req.files as Express.Multer.File[] | undefined;
  const user = req.user!;

  if (!newsId || !user) {
    res.status(400).json({ message: "News ID or user is missing" });
    return;
  }

  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: { userId: true },
  });

  if (!news) {
    res.status(404).json({ message: "News not found" });
    return;
  }

  if (news.userId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  if (!files || files.length === 0) {
    res.status(400).json({ message: "No media files uploaded" });
    return;
  }

  try {
    const uploadAndDbPromises = files.map(async (file, index) => {
      const fileName = `${Date.now()}-${file.originalname}`;

      const { error: uploadError } = await supabase.storage
        .from("news-media")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from("news-media")
        .getPublicUrl(fileName);

      return prisma.mediaNews.create({
        data: {
          mediaUrl: publicUrlData.publicUrl,
          type: file.mimetype,
          format: file.originalname.split(".").pop()!,
          size: file.size,
          order: index,
          newsId,
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
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateNews = async (req: Request, res: Response) => {
  const { newsId } = req.params;
  const { title, subtitle, description, programType } = req.body;
  const user = req.user!;

  if (!Object.values(ProgramType).includes(programType)) {
    res.status(400).json({ message: "Invalid program type" });
    return;
  }

  if (!newsId) {
    res.status(400).json({ message: "News ID or user is missing" });
    return;
  }

  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: { userId: true },
  });

  if (!news) {
    res.status(404).json({ message: "News not found" });
    return;
  }

  if (news.userId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    await prisma.news.update({
      where: { id: newsId },
      data: { title, subtitle, description, programType },
    });

    res.status(200).json({ message: "News updated successfully" });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateNewsMedia = async (req: Request, res: Response) => {
  const { newsId } = req.params;
  const { mediaIdsToDelete } = req.body;
  const files = req.files as Express.Multer.File[] | undefined;
  const user = req.user!;

  if (!newsId || !user) {
    res.status(400).json({ message: "News ID or user is missing" });
    return;
  }

  let normalizedMediaIds: string[] = [];
  if (mediaIdsToDelete) {
    normalizedMediaIds = Array.isArray(mediaIdsToDelete)
      ? mediaIdsToDelete
      : [mediaIdsToDelete];
  }

  const news = await prisma.news.findUnique({
    where: { id: newsId },
    select: { userId: true },
  });

  if (!news) {
    res.status(404).json({ message: "News not found" });
    return;
  }

  if (news.userId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  try {
    let deletedMediaCount = 0;
    let addedMediaCount = 0;

    if (normalizedMediaIds.length > 0) {
      const mediaToDelete = await prisma.mediaNews.findMany({
        where: { id: { in: normalizedMediaIds }, newsId },
        select: { id: true, mediaUrl: true },
      });

      const fileNamesToDelete = mediaToDelete
        .map((m) => decodeURIComponent(m.mediaUrl.split("/").pop()!))
        .filter(Boolean);

      if (fileNamesToDelete.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("news-media")
          .remove(fileNamesToDelete);

        if (removeError) console.error("Supabase remove error:", removeError);
      }

      const deletedResult = await prisma.mediaNews.deleteMany({
        where: { id: { in: normalizedMediaIds } },
      });
      deletedMediaCount = deletedResult.count;
    }

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file, index) => {
        const fileName = `${Date.now()}-${file.originalname}`;

        const { error: uploadError } = await supabase.storage
          .from("news-media")
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (uploadError) {
          console.error("Supabase upload error:", uploadError);
          return null;
        }

        const { data: publicUrlData } = supabase.storage
          .from("news-media")
          .getPublicUrl(fileName);

        return prisma.mediaNews.create({
          data: {
            mediaUrl: publicUrlData.publicUrl,
            type: file.mimetype,
            format: file.originalname.split(".").pop()!,
            size: file.size,
            order: index,
            newsId,
          },
          select: { id: true },
        });
      });

      const addedResults = await Promise.all(uploadPromises);
      addedMediaCount = addedResults.filter(Boolean).length;
    }

    res.status(200).json({
      message: "News media updated successfully",
      deletedMediaCount,
      addedMediaCount,
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteNews = async (req: Request, res: Response) => {
  const { newsId } = req.params;
  const user = req.user!;

  if (!newsId) {
    res.status(400).json({ message: "News ID is required" });
    return;
  }

  try {
    const news = await prisma.news.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        userId: true,
        MediaNews: { select: { id: true, mediaUrl: true } },
      },
    });

    if (!news) {
      res.status(404).json({ message: "News not found" });
      return;
    }

    if (news.userId !== user.id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    await Promise.all(
      news.MediaNews.map(async (m) => {
        const fileName = decodeURIComponent(m.mediaUrl.split("/").pop()!);

        try {
          await supabase.storage.from("news-media").remove([fileName]);
          await prisma.mediaNews.delete({ where: { id: m.id } });
          return { mediaId: m.id, success: true };
        } catch (err) {
          return { mediaId: m.id, success: false };
        }
      })
    );

    await prisma.news.delete({ where: { id: newsId } });

    res.status(200).json({
      message: "News and all media deleted",
    });
  } catch {
    res.status(500).json({ message: "Server Error" });
  }
};
