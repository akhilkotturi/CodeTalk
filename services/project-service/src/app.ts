import express from "express";
import { requireAuth } from "./middleware/auth";
import { projectRouter } from "./routes/projects";

export const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
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
