import { IncomingMessage } from "http";
import { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import {
  parseUpgradeAuth,
  createDefaultFetcher,
  IncidentFetcher,
} from "./auth";
import { RoomManager, Client } from "./rooms";

interface ServerOptions {
  rooms?: RoomManager;
  fetcher?: IncidentFetcher;
}

/**
 * Attach WebSocket handling to an existing HTTP server.
 * Returns the WebSocketServer so callers can terminate clients on teardown.
 *
 * Auth happens inside the `connection` event: unauthenticated connections are
 * closed immediately with application close code 4401. This keeps the HTTP
 * upgrade handshake synchronous while still signalling auth failure clearly.
 */
export function createServer(
  httpServer: HttpServer,
  options: ServerOptions = {}
): WebSocketServer {
  const rooms = options.rooms ?? new RoomManager();
  const fetcher = options.fetcher ?? createDefaultFetcher();

  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    // Only handle /ws path; reject everything else.
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    if (pathname !== "/ws") {
      ws.close(4400);
      return;
    }

    const auth = await parseUpgradeAuth(req, fetcher);
    if (!auth) {
      ws.close(4401);
      return;
    }

    const client: Client = {
      ws,
      role: auth.role,
      userId: auth.userId,
      incidentId: auth.incidentId,
    };

    rooms.join(client);

    // Notify existing room members that someone joined
    rooms.broadcast(
      client.incidentId,
      { type: "user_joined", userId: client.userId, role: client.role },
      client
    );

    // Send the current room state to the new connection
    const snapshot = await fetcher.fetchSnapshot(client.incidentId);
    ws.send(JSON.stringify({ type: "room_snapshot", ...snapshot }));

    ws.on("message", (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(data.toString()) as Record<string, unknown>;
      } catch {
        return; // ignore malformed JSON
      }

      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      // Viewers cannot send mutation events — silently drop them.
      if (
        client.role === "viewer" &&
        (msg.type === "block_event" || msg.type === "cursor_move")
      ) {
        return;
      }

      if (msg.type === "block_event") {
        rooms.broadcast(
          client.incidentId,
          {
            type: "block_event",
            userId: client.userId,
            blockId: msg.blockId,
            action: msg.action,
            data: msg.data,
          },
          client
        );
      }

      if (msg.type === "cursor_move") {
        // Cursor presence is editor-only; viewers don't need to see it.
        rooms.broadcastToEditors(
          client.incidentId,
          {
            type: "cursor_moved",
            userId: client.userId,
            x: msg.x,
            y: msg.y,
          },
          client
        );
      }
    });

    ws.on("close", () => {
      rooms.leave(client);
      rooms.broadcast(client.incidentId, {
        type: "user_left",
        userId: client.userId,
      });
    });
  });

  return wss;
}
