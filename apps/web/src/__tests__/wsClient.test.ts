import { connect, disconnect, sendBlockEvent, sendCursorMove } from "../lib/wsClient";
import { useRoomStore } from "../lib/store/room";
import { useCursorsStore } from "../lib/store/cursors";
import { FakeWebSocket } from "../test/fakeWebSocket";

function fakeFactory(url: string) {
  return new FakeWebSocket(url) as unknown as WebSocket;
}

describe("wsClient", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    useRoomStore.getState().reset();
    useCursorsStore.getState().reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    disconnect();
    jest.useRealTimers();
  });

  it("connects with token+incidentId for editor role", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);

    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toContain("token=jwt");
    expect(ws.url).toContain("incidentId=incident-1");
  });

  it("connects with joinCode for viewer role", () => {
    connect({ role: "viewer", joinCode: "ABC123" }, undefined, fakeFactory);

    expect(FakeWebSocket.instances[0].url).toContain("joinCode=ABC123");
  });

  it("applies an incoming room_snapshot to the room store", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage({ type: "room_snapshot", incident: null, blocks: [] });

    expect(useRoomStore.getState().blocks).toEqual([]);
  });

  it("dispatches block_event messages into the room store", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage({
      type: "block_event",
      userId: "grace",
      blockId: "block-1",
      action: "created",
      data: {
        id: "block-1",
        incidentId: "incident-1",
        authorId: "grace",
        blockType: "log",
        body: "hi",
        subject: null,
        createdAt: "now",
      },
    });

    expect(useRoomStore.getState().blocks).toHaveLength(1);
  });

  it("dispatches cursor_moved messages into the cursors store", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    ws.simulateMessage({ type: "cursor_moved", userId: "grace", x: 0.5, y: 0.25 });

    expect(useCursorsStore.getState().positions.grace).toEqual({ x: 0.5, y: 0.25 });
  });

  it("sendBlockEvent sends a JSON block_event message", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    sendBlockEvent("block-1", "created", { id: "block-1" });

    expect(JSON.parse(ws.sent[ws.sent.length - 1])).toEqual({
      type: "block_event",
      blockId: "block-1",
      action: "created",
      data: { id: "block-1" },
    });
  });

  it("throttles sendCursorMove calls within 50ms", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    sendCursorMove(0.1, 0.1);
    sendCursorMove(0.2, 0.2);

    const cursorMessages = ws.sent.filter((raw) => JSON.parse(raw).type === "cursor_move");
    expect(cursorMessages).toHaveLength(1);
  });

  it("reconnects with backoff after an unexpected close", () => {
    const onReconnecting = jest.fn();
    connect(
      { role: "editor", token: "jwt", incidentId: "incident-1" },
      { onReconnecting },
      fakeFactory
    );
    const first = FakeWebSocket.instances[0];
    first.simulateOpen();

    first.close(1006);
    expect(onReconnecting).toHaveBeenCalledWith(1);

    jest.advanceTimersByTime(500);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("does not reconnect after an explicit disconnect", () => {
    connect({ role: "editor", token: "jwt", incidentId: "incident-1" }, undefined, fakeFactory);
    const ws = FakeWebSocket.instances[0];
    ws.simulateOpen();

    disconnect();
    jest.advanceTimersByTime(10000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
