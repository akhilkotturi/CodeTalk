import "dotenv/config";
import http from "http";
import { createServer } from "./server";

const port = Number(process.env.PORT ?? 4002);

const httpServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "ws-gateway" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

createServer(httpServer);

httpServer.listen(port, () => {
  console.log(`ws-gateway listening on port ${port}`);
});
