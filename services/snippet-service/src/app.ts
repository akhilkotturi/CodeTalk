import express from "express";
import { requireAuth } from "./middleware/auth";
import { snippetRouter } from "./routes/snippets";

export const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "snippet-service" });
});

app.use("/snippets", requireAuth, snippetRouter);
