import type { Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { OrganizationPosition, Status } from "@prisma/client";
import supabase from "../../lib/supabase.js";

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
