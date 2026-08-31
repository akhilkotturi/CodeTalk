import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";


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

export function requireServiceAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const serviceToken = process.env.SERVICE_TOKEN;
  if (!serviceToken) {
    res.status(503).json({ error: "SERVICE_TOKEN not configured" });
    return;
  }
  if (req.headers.authorization === `Service ${serviceToken}`) {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden" });
}
