import type { Request, Response } from "express";
import prisma from "../../lib/prisma.js";

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
