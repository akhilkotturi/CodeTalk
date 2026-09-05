import { WebSocket } from "ws";
import { Client, RoomManager } from "../rooms";
import { PresenceEntry, PresenceStore } from "../redis";

function makeClient(): Client {
  return {
    ws: {} as WebSocket,
    role: "editor",
    userId: "user-1",
    incidentId: "incident-1",
  };
}

describe("RoomManager Redis presence", () => {
  it("persists joins, refreshes heartbeats, and removes leaves", async () => {
    const store: jest.Mocked<PresenceStore> = {
      add: jest.fn(),
      touch: jest.fn(),
      remove: jest.fn(),
    };
    const client = makeClient();
    const rooms = new RoomManager(store);

    rooms.join(client);
    rooms.touch(client);
    rooms.leave(client);
    await Promise.resolve();

    const entry: PresenceEntry = { userId: client.userId, role: client.role };
    expect(store.add).toHaveBeenCalledWith(client.incidentId, entry);
    expect(store.touch).toHaveBeenCalledWith(client.incidentId, entry);
    expect(store.remove).toHaveBeenCalledWith(client.incidentId, entry);
  });
});