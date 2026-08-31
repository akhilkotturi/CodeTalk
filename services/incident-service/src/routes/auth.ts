import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

// TODO(phase-4): replace with a dedicated auth service behind Kong.
// This endpoint issues tokens without a password or user lookup — it is a
// dev-phase issuer only and must never be exposed in production as-is.

export const authRouter = Router();

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

  const token = jwt.sign({ sub: userId.trim() }, secret, { expiresIn: "24h" });
  res.status(200).json({ token });
});
