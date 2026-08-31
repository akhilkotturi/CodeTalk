import express from "express";
import { authRouter } from "./routes/auth";
import { incidentRouter } from "./routes/incidents";
import { joinRouter } from "./routes/join";
import { membersRouter } from "./routes/members";
import { blocksRouter } from "./routes/blocks";
import { linksRouter } from "./routes/links";
import { requireAuth } from "./middleware/auth";

export const app = express();

app.use(express.json());

// Public routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "incident-service" });
});
app.use("/auth", authRouter);

// Protected routes — all /incidents* require a valid JWT
app.use("/incidents", requireAuth);
app.use("/incidents/join", joinRouter);
app.use("/incidents", incidentRouter);
app.use("/incidents/:id/members", membersRouter);
app.use("/incidents/:id/blocks", blocksRouter);
app.use("/incidents/:id/links", linksRouter);
