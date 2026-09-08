import "dotenv/config";
import { Pool } from "pg";
import * as Y from "yjs";
import { Server } from "@hocuspocus/server";
import { authenticateCollaborationSession, parseDocumentName } from "./auth";

const port = Number(process.env.PORT ?? 4005);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collaboration_documents (
      project_id uuid NOT NULL,
      kind text NOT NULL,
      state bytea NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (project_id, kind),
      CONSTRAINT collaboration_documents_kind_check CHECK (kind IN ('whiteboard', 'plan'))
    )
  `);
}

const collaboration = Server.configure({
  port,
  async onAuthenticate({ token, documentName }) {
    await authenticateCollaborationSession({
      token,
      documentName,
      secret: process.env.JWT_SECRET,
      query: (sql, params) => pool.query(sql, params),
    });
  },
  async onLoadDocument({ documentName, document }) {
    const parsed = parseDocumentName(documentName);
    if (!parsed) return;
    const result = await pool.query<{ state: Buffer }>(
      "SELECT state FROM collaboration_documents WHERE project_id = $1 AND kind = $2",
      [parsed.projectId, parsed.kind]
    );
    const state = result.rows[0]?.state;
    if (state) Y.applyUpdate(document, new Uint8Array(state));
  },
  async onStoreDocument({ documentName, document }) {
    const parsed = parseDocumentName(documentName);
    if (!parsed) return;
    const state = Buffer.from(Y.encodeStateAsUpdate(document));
    await pool.query(
      `INSERT INTO collaboration_documents (project_id, kind, state)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, kind) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
      [parsed.projectId, parsed.kind, state]
    );
  },
});

void ensureSchema().then(() => {
  collaboration.listen();
  console.log(`collaboration-service listening on port ${port}`);
}).catch((error) => {
  console.error("collaboration-service startup failed", error);
  process.exitCode = 1;
});
