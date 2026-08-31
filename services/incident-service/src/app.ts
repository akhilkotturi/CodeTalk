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
