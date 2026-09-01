import http from "http";
import { AddressInfo } from "net";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { createServer } from "../server";
import { RoomManager } from "../rooms";
import { IncidentFetcher } from "../auth";

// Set env vars before anything reads them
process.env.JWT_SECRET = "test-secret-for-local-dev";
process.env.SERVICE_TOKEN = "test-service-token";
process.env.INCIDENT_SERVICE_URL = "http://localhost:4000";

const INCIDENT_ID = "00000000-0000-0000-0000-000000000010";
const JOIN_CODE = "TESTCD";
const USER_A = "00000000-0000-0000-0000-000000000002";
const USER_B = "00000000-0000-0000-0000-000000000003";

function createToken(userId: string): string {
  return jwt.sign({ sub: userId }, "test-secret-for-local-dev", {
    expiresIn: "1h",
  });
}

/** Mock fetcher — no real HTTP calls in unit tests. */
function makeMockFetcher(): IncidentFetcher {
  return {
    fetchByCode: jest.fn(async (code: string) => {
      if (code === JOIN_CODE) return { id: INCIDENT_ID, title: "Test Inc" };
      return null;
    }),
    fetchSnapshot: jest.fn(async () => ({
      incident: { id: INCIDENT_ID, title: "Test Inc" },
      blocks: [],
    })),
  };
}

let server: http.Server;
let wss: WebSocketServer;
let port: number;
let mockFetcher: IncidentFetcher;

beforeEach((done) => {
  mockFetcher = makeMockFetcher();
  server = http.createServer();
  wss = createServer(server, { rooms: new RoomManager(), fetcher: mockFetcher });
  server.listen(0, () => {
    port = (server.address() as AddressInfo).port;
    done();
  });
});

afterEach((done) => {
  // Terminate all open WebSocket connections so server.close() doesn't hang
  // waiting for persistent WS connections to drain.
  wss.clients.forEach((ws) => ws.terminate());
  server.close(done);
});

/**
 * Per-socket message queues to avoid a race condition: the server sends
 * room_snapshot before the client fires 'open' (same-process micro-task
 * ordering), so registering a 'message' listener after 'open' would miss it.
 * Instead we buffer every message from the moment the socket is created.
 */
type MsgHandler = (msg: Record<string, unknown>) => void;
interface SocketState {
  queue: Record<string, unknown>[];
  waiters: MsgHandler[];
}
const msgQueues = new WeakMap<WebSocket, SocketState>();

function attachBuffer(ws: WebSocket): void {
  const state: SocketState = { queue: [], waiters: [] };
  msgQueues.set(ws, state);
  ws.on("message", (data) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data.toString()) as Record<string, unknown>;
    } catch {
      return;
    }
    const waiter = state.waiters.shift();
    if (waiter) {
      waiter(msg);
    } else {
      state.queue.push(msg);
    }
  });
}

/** Open a WS connection; resolves on open. Message buffering starts immediately. */
function connect(params: Record<string, string>): Promise<WebSocket> {
  const qs = new URLSearchParams(params).toString();
  const ws = new WebSocket(`ws://localhost:${port}/ws?${qs}`);
  attachBuffer(ws);
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

/**
 * Connect and wait for the WS to close.
 * Resolves with the close code (use for auth-failure assertions).
 */
function connectExpectingClose(params: Record<string, string>): Promise<number> {
  const qs = new URLSearchParams(params).toString();
  const ws = new WebSocket(`ws://localhost:${port}/ws?${qs}`);
  return new Promise((resolve, reject) => {
    ws.once("close", (code) => resolve(code));
    ws.once("error", reject);
  });
}

/** Wait for the next message from a WebSocket (reads from the buffer if available). */
function receive(ws: WebSocket): Promise<Record<string, unknown>> {
  const state = msgQueues.get(ws);
  if (!state) return Promise.reject(new Error("ws not tracked — use connect()"));

  if (state.queue.length > 0) {
    return Promise.resolve(state.queue.shift()!);
  }

  return new Promise((resolve, reject) => {
    state.waiters.push(resolve);
    ws.once("error", reject);
    ws.once("close", (code) =>
      reject(new Error(`WS closed with code ${code} while waiting for message`))
    );
  });
}

// ── Editor connections ──────────────────────────────────────────────────────

describe("editor connections", () => {
  it("connects with a valid JWT and receives room_snapshot", async () => {
    const ws = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const msg = await receive(ws);

    expect(msg.type).toBe("room_snapshot");
    expect((msg.incident as Record<string, unknown>).id).toBe(INCIDENT_ID);
    ws.close();
  });

  it("broadcasts user_joined to existing members when a new editor connects", async () => {
    const wsA = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    await receive(wsA); // A's own room_snapshot

    const wsB = await connect({
      token: createToken(USER_B),
      incidentId: INCIDENT_ID,
    });
    await receive(wsB); // B's room_snapshot

    const joined = await receive(wsA); // user_joined notification
    expect(joined.type).toBe("user_joined");
    expect(joined.role).toBe("editor");

    wsA.close();
    wsB.close();
  });

  it("broadcasts block_event to all room members", async () => {
    const wsA = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsB = await connect({
      token: createToken(USER_B),
      incidentId: INCIDENT_ID,
    });
    await receive(wsA); // A's snapshot
    await receive(wsA); // user_joined for B
    await receive(wsB); // B's snapshot

    wsA.send(
      JSON.stringify({
        type: "block_event",
        blockId: "block-1",
        action: "created",
        data: { body: "hello" },
      })
    );
    const event = await receive(wsB);

    expect(event.type).toBe("block_event");
    expect(event.blockId).toBe("block-1");
    expect(event.action).toBe("created");

    wsA.close();
    wsB.close();
  });

  it("broadcasts cursor_moved to editors only — not to viewers", async () => {
    const wsEditor = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsViewer = await connect({ joinCode: JOIN_CODE });
    await receive(wsEditor); // snapshot
    await receive(wsEditor); // viewer joined
    await receive(wsViewer); // snapshot

    let viewerGotCursor = false;
    wsViewer.on("message", () => {
      viewerGotCursor = true;
    });

    wsEditor.send(JSON.stringify({ type: "cursor_move", x: 0.5, y: 0.3 }));

    await new Promise((r) => setTimeout(r, 80));
    expect(viewerGotCursor).toBe(false);

    wsEditor.close();
    wsViewer.close();
  });

  it("broadcasts user_left when an editor disconnects", async () => {
    const wsA = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsB = await connect({
      token: createToken(USER_B),
      incidentId: INCIDENT_ID,
    });
    await receive(wsA); // snapshot
    await receive(wsA); // user_joined for B
    await receive(wsB); // snapshot

    wsB.close();
    const left = await receive(wsA);

    expect(left.type).toBe("user_left");

    wsA.close();
  });

  it("responds to ping with pong", async () => {
    const ws = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    await receive(ws); // snapshot

    ws.send(JSON.stringify({ type: "ping" }));
    const pong = await receive(ws);
    expect(pong.type).toBe("pong");
    ws.close();
  });
});

// ── Auth failures ───────────────────────────────────────────────────────────

describe("auth failures", () => {
  it("closes connection with code 4401 for an invalid token", async () => {
    const code = await connectExpectingClose({
      token: "not-a-jwt",
      incidentId: INCIDENT_ID,
    });
    expect(code).toBe(4401);
  });

  it("closes connection with code 4401 for a token signed with the wrong secret", async () => {
    const badToken = jwt.sign({ sub: USER_A }, "wrong-secret");
    const code = await connectExpectingClose({
      token: badToken,
      incidentId: INCIDENT_ID,
    });
    expect(code).toBe(4401);
  });

  it("closes connection with code 4401 when neither token nor joinCode is provided", async () => {
    const code = await connectExpectingClose({ incidentId: INCIDENT_ID });
    expect(code).toBe(4401);
  });
});

// ── Viewer / present mode ───────────────────────────────────────────────────

describe("viewer / present mode", () => {
  it("connects with a valid joinCode and receives room_snapshot", async () => {
    const ws = await connect({ joinCode: JOIN_CODE });
    const msg = await receive(ws);

    expect(msg.type).toBe("room_snapshot");
    expect(mockFetcher.fetchByCode).toHaveBeenCalledWith(JOIN_CODE);
    ws.close();
  });

  it("closes connection with code 4401 for an unknown joinCode", async () => {
    const code = await connectExpectingClose({ joinCode: "XXXXXX" });
    expect(code).toBe(4401);
  });

  it("viewer receives block_event broadcast from an editor", async () => {
    const wsEditor = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsViewer = await connect({ joinCode: JOIN_CODE });
    await receive(wsEditor); // snapshot
    await receive(wsEditor); // viewer_joined
    await receive(wsViewer); // snapshot

    wsEditor.send(
      JSON.stringify({
        type: "block_event",
        blockId: "b1",
        action: "updated",
        data: {},
      })
    );
    const event = await receive(wsViewer);

    expect(event.type).toBe("block_event");
    expect(event.blockId).toBe("b1");

    wsEditor.close();
    wsViewer.close();
  });

  it("viewer block_event is silently dropped and not broadcast to editors", async () => {
    const wsEditor = await connect({
      token: createToken(USER_A),
      incidentId: INCIDENT_ID,
    });
    const wsViewer = await connect({ joinCode: JOIN_CODE });
    await receive(wsEditor); // snapshot
    await receive(wsEditor); // viewer joined
    await receive(wsViewer); // snapshot

    let editorGotEvent = false;
    wsEditor.on("message", () => {
      editorGotEvent = true;
    });

    wsViewer.send(
      JSON.stringify({
        type: "block_event",
        blockId: "b2",
        action: "created",
        data: {},
      })
    );

    await new Promise((r) => setTimeout(r, 80));
    expect(editorGotEvent).toBe(false);

    wsEditor.close();
    wsViewer.close();
  });

  it("two viewers can connect to the same room simultaneously", async () => {
    const wsV1 = await connect({ joinCode: JOIN_CODE });
    const wsV2 = await connect({ joinCode: JOIN_CODE });
    await receive(wsV1); // snapshot
    await receive(wsV1); // user_joined for V2
    await receive(wsV2); // snapshot

    wsV1.close();
    wsV2.close();
  });
});
