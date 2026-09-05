import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

// TODO(phase-4): replace with a dedicated auth service behind Kong.
// This endpoint issues tokens without a password or user lookup — it is a
// dev-phase issuer only and must never be exposed in production as-is.

export const authRouter = Router();
const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

authRouter.post("/token", (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };
  if (!userId || typeof userId !== "string" || userId.trim() === "") {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is not set");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  const normalizedUserId = userId.trim();
  const identity = UUID_PATTERN.test(normalizedUserId) ? normalizedUserId : randomUUID();
  const token = jwt.sign({ sub: identity, displayName: normalizedUserId }, secret, { expiresIn: "24h" });
  res.status(200).json({ token, userId: identity });
});
