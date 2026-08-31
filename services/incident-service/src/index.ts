import express from "express";
import "dotenv/config";

const app = express();
const port = process.env.PORT ?? 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "incident-service" });
});

// Incident routes (create/join/list) land in the next commit, once the
// Postgres migration for `incidents` exists.

app.listen(port, () => {
  console.log(`incident-service listening on port ${port}`);
});
