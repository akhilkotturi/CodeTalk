import { useRoomStore } from "../../lib/store/room";
import type { Incident, IncidentBlock } from "@CodeTalk/types";

const incident: Incident = {
  id: "incident-1",
  title: "DB is down",
  description: null,
  ownerId: "ada",
  joinCode: "ABC123",
  status: "active",
  createdAt: "2026-09-03T00:00:00.000Z",
  resolvedAt: null,
};

const block: IncidentBlock = {
  id: "block-1",
  incidentId: "incident-1",
  authorId: "ada",
  blockType: "log",
  body: "seeing 500s",
  subject: null,
  createdAt: "2026-09-03T00:01:00.000Z",
};

describe("room store", () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  it("applySnapshot replaces incident and blocks", () => {
    useRoomStore.getState().applySnapshot(incident, [block]);

    expect(useRoomStore.getState().incident).toEqual(incident);
    expect(useRoomStore.getState().blocks).toEqual([block]);
  });

  it("applyBlockEvent inserts a new block on 'created'", () => {
    useRoomStore.getState().applyBlockEvent({
      userId: "ada",
      blockId: block.id,
      action: "created",
      data: block as unknown as Record<string, unknown>,
    });

    expect(useRoomStore.getState().blocks).toEqual([block]);
  });

  it("applyBlockEvent replaces an existing block on 'updated'", () => {
    useRoomStore.getState().applySnapshot(incident, [block]);
    const updated = { ...block, body: "seeing 502s now" };

    useRoomStore.getState().applyBlockEvent({
      userId: "ada",
      blockId: block.id,
      action: "updated",
      data: updated,
    });

    expect(useRoomStore.getState().blocks).toEqual([updated]);
  });

  it("applyBlockEvent removes the block on 'deleted'", () => {
    useRoomStore.getState().applySnapshot(incident, [block]);

    useRoomStore.getState().applyBlockEvent({
      userId: "ada",
      blockId: block.id,
      action: "deleted",
      data: {},
    });

    expect(useRoomStore.getState().blocks).toEqual([]);
  });

  it("applyUserJoined adds a member once, applyUserLeft removes them", () => {
    useRoomStore.getState().applyUserJoined("grace", "editor");
    useRoomStore.getState().applyUserJoined("grace", "editor");

    expect(useRoomStore.getState().members).toEqual([{ userId: "grace", role: "editor" }]);

    useRoomStore.getState().applyUserLeft("grace");

    expect(useRoomStore.getState().members).toEqual([]);
  });

  it("updateIncident merges a partial patch", () => {
    useRoomStore.getState().applySnapshot(incident, []);

    useRoomStore
      .getState()
      .updateIncident({ status: "resolved", resolvedAt: "2026-09-03T01:00:00.000Z" });

    expect(useRoomStore.getState().incident).toEqual({
      ...incident,
      status: "resolved",
      resolvedAt: "2026-09-03T01:00:00.000Z",
    });
  });
});
