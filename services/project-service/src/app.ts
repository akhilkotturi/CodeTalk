import express from "express";
import { requireAuth } from "./middleware/auth";
import { projectRouter } from "./routes/projects";

export const app = express();

const VITE_DEV_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && VITE_DEV_ORIGIN_PATTERN.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok", service: "project-service" }));
app.use("/projects", requireAuth, projectRouter);
