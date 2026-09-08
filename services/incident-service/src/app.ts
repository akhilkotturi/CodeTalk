import express from "express";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";
import { internalRouter } from "./routes/internal";
import { incidentRouter } from "./routes/incidents";
import { joinRouter } from "./routes/join";
import { membersRouter } from "./routes/members";
import { blocksRouter } from "./routes/blocks";
import { linksRouter } from "./routes/links";
import { requireAuth, requireServiceAuth } from "./middleware/auth";

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

// Public routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "incident-service" });
});
app.use("/auth", authRouter);
app.use("/incidents", publicRouter); // public incident endpoints (no JWT)

// Service-to-service routes — not routed through Kong
app.use("/internal", requireServiceAuth, internalRouter);

// Protected routes — all /incidents* require a valid JWT
app.use("/incidents", requireAuth);
app.use("/incidents/join", joinRouter);
app.use("/incidents", incidentRouter);
app.use("/incidents/:id/members", membersRouter);
app.use("/incidents/:id/blocks", blocksRouter);
app.use("/incidents/:id/links", linksRouter);
