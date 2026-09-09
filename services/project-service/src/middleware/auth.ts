import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET ?? "") as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || !UUID_PATTERN.test(payload.sub)) {
      res.status(401).json({ error: "Invalid token subject" });
      return;
    }
    req.user = { sub: payload.sub, displayName: typeof payload.displayName === "string" ? payload.displayName : undefined, githubLogin: typeof payload.githubLogin === "string" ? payload.githubLogin : undefined };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
