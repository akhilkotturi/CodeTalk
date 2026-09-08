import jwt from "jsonwebtoken";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CollaborationDocumentKind = "whiteboard" | "plan";

export interface CollaborationDocumentName {
  projectId: string;
  kind: CollaborationDocumentKind;
}

export interface AuthenticatedCollaborationSession extends CollaborationDocumentName {
  userId: string;
}

export type MembershipQuery = (
  sql: string,
  params: [string, string]
) => Promise<{ rowCount: number | null; rows?: unknown[] }>;

export function parseDocumentName(documentName: string): CollaborationDocumentName | null {
  const match = /^project:([^:]+):(whiteboard|plan)$/.exec(documentName);
  if (!match || !UUID_PATTERN.test(match[1])) return null;
  return { projectId: match[1], kind: match[2] as CollaborationDocumentKind };
}

export async function authenticateCollaborationSession({
  token,
  documentName,
  secret,
  query,
}: {
  token: string | undefined;
  documentName: string;
  secret: string | undefined;
  query: MembershipQuery;
}): Promise<AuthenticatedCollaborationSession> {
  const parsed = parseDocumentName(documentName);
  if (!secret || !parsed || !token) throw new Error("Invalid collaboration session");

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret) as jwt.JwtPayload;
  } catch {
    throw new Error("Invalid or expired collaboration token");
  }

  if (typeof payload.sub !== "string" || !UUID_PATTERN.test(payload.sub)) {
    throw new Error("Invalid collaboration token subject");
  }

  const membership = await query(
    "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1",
    [parsed.projectId, payload.sub]
  );

  if (!membership.rowCount) throw new Error("Project membership required");

  return { ...parsed, userId: payload.sub };
}
