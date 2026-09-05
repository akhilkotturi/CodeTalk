export type BlockType = "log" | "hypothesis" | "fix_attempt" | "root_cause" | "custom";

export type TaskStatus = "backlog" | "doing" | "blocked" | "done";

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  assigneeId: string | null;
  dueLabel: string | null;
  githubUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  joinCode: string;
  status: "active" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
}

export interface IncidentBlock {
  id: string;
  incidentId: string;
  authorId: string;
  blockType: BlockType;
  body: string;
  subject: string | null;
  createdAt: string;
}

export interface IncidentMember {
  incidentId: string;
  userId: string;
  role: "owner" | "responder";
  joinedAt: string;
}

export type ClientRole = "editor" | "viewer";
export type BlockEventAction = "created" | "updated" | "deleted";

export interface RoomSnapshotMessage {
  type: "room_snapshot";
  incident: Incident | null;
  blocks: IncidentBlock[];
}

export interface UserJoinedMessage {
  type: "user_joined";
  userId: string;
  role: ClientRole;
}

export interface UserLeftMessage {
  type: "user_left";
  userId: string;
}

export interface BlockEventMessage {
  type: "block_event";
  userId: string;
  blockId: string;
  action: BlockEventAction;
  data: Record<string, unknown>;
}

export interface CursorMovedMessage {
  type: "cursor_moved";
  userId: string;
  x: number;
  y: number;
}

export interface PongMessage {
  type: "pong";
}

export type ServerMessage =
  | RoomSnapshotMessage
  | UserJoinedMessage
  | UserLeftMessage
  | BlockEventMessage
  | CursorMovedMessage
  | PongMessage;

export interface BlockEventClientMessage {
  type: "block_event";
  blockId: string;
  action: BlockEventAction;
  data: Record<string, unknown>;
}

export interface CursorMoveClientMessage {
  type: "cursor_move";
  x: number;
  y: number;
}

export interface PingMessage {
  type: "ping";
}

export type ClientMessage = BlockEventClientMessage | CursorMoveClientMessage | TaskEventClientMessage | PingMessage;

export type TaskEventAction = "created" | "updated" | "deleted";

export interface TaskEventMessage {
  type: "task_event";
  userId: string;
  taskId: string;
  action: TaskEventAction;
  data: Record<string, unknown>;
}

export interface ProjectUserJoinedMessage {
  type: "project_user_joined";
  userId: string;
}

export type ProjectServerMessage = TaskEventMessage | ProjectUserJoinedMessage | PongMessage;

export interface TaskEventClientMessage {
  type: "task_event";
  taskId: string;
  action: TaskEventAction;
  data: Record<string, unknown>;
}
