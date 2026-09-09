import "express";

declare global {
  namespace Express {
    interface Request {
      user: { sub: string; displayName?: string; githubLogin?: string };
    }
  }
}

export {};
