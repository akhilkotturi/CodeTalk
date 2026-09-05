import type { BlockEventAction, ClientMessage, ProjectServerMessage, ServerMessage, TaskEventAction } from "@CodeTalk/types";
import { useRoomStore } from "./store/room";
import { useCursorsStore } from "./store/cursors";
import { useTaskStore } from "./store/tasks";

const WS_BASE_URL = "ws://localhost:8000";
const HEARTBEAT_INTERVAL_MS = 15000;
const CURSOR_THROTTLE_MS = 50;
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 8000;

export type ConnectOptions =
  | { role: "editor"; token: string; incidentId: string }
  | { role: "project_editor"; token: string; projectId: string }
  | { role: "viewer"; joinCode: string };

export interface ConnectionCallbacks {
  onOpen?: () => void;
  onClose?: (code: number) => void;
  onReconnecting?: (attempt: number) => void;
}

type WsFactory = (url: string) => WebSocket;

let socket: WebSocket | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let lastCursorSentAt = 0;
let explicitlyClosed = false;
let currentOptions: ConnectOptions | null = null;
let currentCallbacks: ConnectionCallbacks | undefined;
let currentFactory: WsFactory = (url) => new WebSocket(url);

function buildUrl(options: ConnectOptions): string {
  const url = new URL("/ws", WS_BASE_URL.replace(/^ws/, "http"));
  if (options.role === "editor" || options.role === "project_editor") {
    url.searchParams.set("token", options.token);
    url.searchParams.set(options.role === "editor" ? "incidentId" : "projectId", options.role === "editor" ? options.incidentId : options.projectId);
  } else {
    url.searchParams.set("joinCode", options.joinCode);
  }
  return url.toString().replace(/^http/, "ws");
}

function clearTimers(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  heartbeatTimer = null;
  reconnectTimer = null;
}

function handleMessage(raw: string): void {
  let message: ServerMessage | ProjectServerMessage;
  try {
    message = JSON.parse(raw) as ServerMessage | ProjectServerMessage;
  } catch {
    return;
  }

  switch (message.type) {
    case "room_snapshot":
      useRoomStore.getState().applySnapshot(message.incident, message.blocks);
      break;
    case "user_joined":
      useRoomStore.getState().applyUserJoined(message.userId, message.role);
      break;
    case "user_left":
      useRoomStore.getState().applyUserLeft(message.userId);
      useCursorsStore.getState().removeCursor(message.userId);
      break;
    case "block_event":
      useRoomStore.getState().applyBlockEvent(message);
      break;
    case "cursor_moved":
      useCursorsStore.getState().setCursor(message.userId, message.x, message.y);
      break;
    case "pong":
      break;
    case "task_event":
      useTaskStore.getState().applyEvent(message);
      break;
  }
}

function scheduleReconnect(): void {
  if (explicitlyClosed || !currentOptions) return;
  reconnectAttempt += 1;
  const delay = Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** (reconnectAttempt - 1),
    RECONNECT_MAX_DELAY_MS
  );
  currentCallbacks?.onReconnecting?.(reconnectAttempt);
  reconnectTimer = setTimeout(() => {
    if (currentOptions) openSocket(currentOptions, currentCallbacks, currentFactory);
  }, delay);
}

function openSocket(
  options: ConnectOptions,
  callbacks: ConnectionCallbacks | undefined,
  factory: WsFactory
): void {
  const ws = factory(buildUrl(options));
  socket = ws;

  ws.onopen = () => {
    reconnectAttempt = 0;
    heartbeatTimer = setInterval(() => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, HEARTBEAT_INTERVAL_MS);
    callbacks?.onOpen?.();
  };

  ws.onmessage = (event: MessageEvent) => handleMessage(event.data as string);

  ws.onclose = (event: CloseEvent) => {
    clearTimers();
    callbacks?.onClose?.(event.code);
    scheduleReconnect();
  };
}

export function connect(
  options: ConnectOptions,
  callbacks?: ConnectionCallbacks,
  factory: WsFactory = (url) => new WebSocket(url)
): void {
  explicitlyClosed = false;
  reconnectAttempt = 0;
  currentOptions = options;
  currentCallbacks = callbacks;
  currentFactory = factory;
  openSocket(options, callbacks, factory);
}

export function disconnect(): void {
  explicitlyClosed = true;
  currentOptions = null;
  clearTimers();
  socket?.close(1000);
  socket = null;
}

function sendRaw(message: ClientMessage): void {
  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

export function sendBlockEvent(
  blockId: string,
  action: BlockEventAction,
  data: Record<string, unknown>
): void {
  sendRaw({ type: "block_event", blockId, action, data });
}

export function sendCursorMove(x: number, y: number): void {
  const now = Date.now();
  if (now - lastCursorSentAt < CURSOR_THROTTLE_MS) return;
  lastCursorSentAt = now;
  sendRaw({ type: "cursor_move", x, y });
}

export function sendTaskEvent(taskId: string, action: TaskEventAction, data: Record<string, unknown>): void {
  sendRaw({ type: "task_event", taskId, action, data });
}
