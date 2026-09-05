import { WebSocket } from "ws";
import { PresenceEntry, PresenceStore } from "./redis";

export interface Client {
  ws: WebSocket;
  role: "editor" | "viewer" | "project_editor";
  userId: string;
  incidentId?: string;
  projectId?: string;
}

export class RoomManager {
  private rooms = new Map<string, Set<Client>>();

  constructor(private readonly presenceStore?: PresenceStore) {}

  private roomKey(client: Client): string {
    return client.projectId ? `project:${client.projectId}` : client.incidentId!;
  }

  private presenceEntry(client: Client): PresenceEntry {
    return { userId: client.userId, role: client.role };
  }

  join(client: Client): void {
    const key = this.roomKey(client);
    if (!this.rooms.has(key)) this.rooms.set(key, new Set());
    this.rooms.get(key)!.add(client);
    void Promise.resolve(this.presenceStore?.add(key, this.presenceEntry(client))).catch((error) => {
      console.error("Failed to persist presence join", error);
    });
  }

  leave(client: Client): void {
    const key = this.roomKey(client);
    const room = this.rooms.get(key);
    if (!room) return;
    room.delete(client);
    if (room.size === 0) this.rooms.delete(key);
    void Promise.resolve(this.presenceStore?.remove(key, this.presenceEntry(client))).catch((error) => {
      console.error("Failed to remove presence", error);
    });
  }

  touch(client: Client): void {
    void Promise.resolve(this.presenceStore?.touch(this.roomKey(client), this.presenceEntry(client))).catch((error) => {
      console.error("Failed to refresh presence", error);
    });
  }

  broadcast(roomId: string, message: object, exclude?: Client): void {
    const payload = JSON.stringify(message);
    for (const client of this.rooms.get(roomId) ?? []) {
      if (client !== exclude && client.ws.readyState === WebSocket.OPEN) client.ws.send(payload);
    }
  }

  broadcastToEditors(roomId: string, message: object, exclude?: Client): void {
    const payload = JSON.stringify(message);
    for (const client of this.rooms.get(roomId) ?? []) {
      if (client !== exclude && client.role === "editor" && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  size(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }
}
