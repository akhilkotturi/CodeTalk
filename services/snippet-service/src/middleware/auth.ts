import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// TODO(phase-4): JWT verification moves to Kong gateway — remove this middleware then.
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, secret()) as jwt.JwtPayload;
    if (!payload.sub) {
      res.status(401).json({ error: "Invalid token: missing sub claim" });
      return;
    }
    req.user = { sub: payload.sub };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
