import prisma from "../../lib/prisma.js";
import { addHours, differenceInMinutes } from "date-fns";
import { generateSessionToken } from "../../utils/token.js";

export class AuthService {
  async createSession(userId: string, expiresInHours = 24) {
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async validateSession(token: string) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) return null;

    return session.user;
  }

  async deleteSession(token: string) {
    return prisma.session.delete({
      where: { token },
    });
  }

  async extendSession(token: string, extraHours = 1) {
    await prisma.session.update({
      where: { token },
      data: { expiresAt: addHours(new Date(), extraHours) },
    });

    return token;
  }

  async extendIfNeeded(token: string, thresholdMinutes = 30, extraHours = 1) {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session) return null;

    const minutesLeft = differenceInMinutes(session.expiresAt, new Date());

    if (minutesLeft <= thresholdMinutes) {
      return this.extendSession(token, extraHours);
    }
    return token;
  }
}
