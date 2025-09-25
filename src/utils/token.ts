import crypto from "crypto";

export const generateSessionToken = () => {
  const randomBytes = crypto.randomBytes(32);
  const token = randomBytes.toString("hex");
  return token;
};
