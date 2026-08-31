import { WebSocket } from "ws";

export interface Client {
  ws: WebSocket;
  role: "editor" | "viewer";
  userId: string; // JWT sub for editors, crypto.randomUUID() for viewers
  incidentId: string;
}

export class RoomManager {
  private rooms = new Map<string, Set<Client>>();

  join(client: Client): void {
    if (!this.rooms.has(client.incidentId)) {
      this.rooms.set(client.incidentId, new Set());
    }
    this.rooms.get(client.incidentId)!.add(client);
  }

  leave(client: Client): void {
    const room = this.rooms.get(client.incidentId);
    if (!room) return;
    room.delete(client);
    if (room.size === 0) this.rooms.delete(client.incidentId);
  }

  /** Send to everyone in the room except `exclude`. */
  broadcast(incidentId: string, message: object, exclude?: Client): void {
    const payload = JSON.stringify(message);
    for (const client of this.rooms.get(incidentId) ?? []) {
      if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  /** Send to editors only — cursor events should not go to read-only viewers. */
  broadcastToEditors(
    incidentId: string,
    message: object,
    exclude?: Client
  ): void {
    const payload = JSON.stringify(message);
    for (const client of this.rooms.get(incidentId) ?? []) {
      if (
        client !== exclude &&
        client.role === "editor" &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(payload);
      }
    }
  }

  size(incidentId: string): number {
    return this.rooms.get(incidentId)?.size ?? 0;
  }
}
