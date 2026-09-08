import jwt from "jsonwebtoken";
import { authenticateCollaborationSession, parseDocumentName } from "../auth";

const secret = "collab-test-secret";
const memberUser = "00000000-0000-4000-8000-000000000001";
const otherUser = "00000000-0000-4000-8000-000000000002";
const projectId = "00000000-0000-4000-8000-000000000111";

function tokenFor(userId: string): string {
  return jwt.sign({ sub: userId, displayName: "Ada" }, secret, { expiresIn: "1h" });
}

function membershipQuery(memberIds: string[]) {
  return jest.fn(async (_sql: string, params: unknown[]) => ({
    rowCount: memberIds.includes(params[1] as string) ? 1 : 0,
    rows: memberIds.includes(params[1] as string) ? [{ role: "editor" }] : [],
  }));
}

describe("collaboration auth", () => {
  it("parses project collaboration document names", () => {
    expect(parseDocumentName(`project:${projectId}:whiteboard`)).toEqual({ projectId, kind: "whiteboard" });
    expect(parseDocumentName(`project:${projectId}:plan`)).toEqual({ projectId, kind: "plan" });
    expect(parseDocumentName(`incident:${projectId}:whiteboard`)).toBeNull();
  });

  it("allows a project member to join a project collaboration document", async () => {
    const query = membershipQuery([memberUser]);

    await expect(authenticateCollaborationSession({
      token: tokenFor(memberUser),
      documentName: `project:${projectId}:whiteboard`,
      secret,
      query,
    })).resolves.toEqual({ projectId, kind: "whiteboard", userId: memberUser });
  });

  it("rejects a valid token when the user is not a project member", async () => {
    await expect(authenticateCollaborationSession({
      token: tokenFor(otherUser),
      documentName: `project:${projectId}:plan`,
      secret,
      query: membershipQuery([memberUser]),
    })).rejects.toThrow("Project membership required");
  });
});
