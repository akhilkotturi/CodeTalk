import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { IncidentCache, createRedisIncidentCache } from "./redis";

export interface IncidentFetcher {
  fetchByCode(
    joinCode: string
  ): Promise<{ id: string; title: string } | null>;
  fetchSnapshot(incidentId: string): Promise<{
    incident: Record<string, unknown> | null;
    blocks: unknown[];
  }>;
}

export type AuthResult =
  | { role: "editor"; userId: string; incidentId: string }
  | { role: "viewer"; userId: string; incidentId: string }
  | { role: "project_editor"; userId: string; projectId: string }

/**
 * Parse the WebSocket upgrade request and authenticate the connection.
 *
 * Editor path:  ?token=<JWT>&incidentId=<UUID>
 * Viewer path:  ?joinCode=<CODE>  (no JWT — present mode)
 *
 * Returns null when authentication fails (caller should reject with HTTP 401).
 */
export async function parseUpgradeAuth(
  req: IncomingMessage,
  fetcher: Pick<IncidentFetcher, "fetchByCode">
): Promise<AuthResult | null> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const token = url.searchParams.get("token");
  const incidentId = url.searchParams.get("incidentId");
    const projectId = url.searchParams.get("projectId");
  const joinCode = url.searchParams.get("joinCode");

  // ── Editor path ─────────────────────────────────────────────────────────
  if (token && incidentId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!payload.sub) return null;
      return { role: "editor", userId: payload.sub, incidentId };
    } catch {
      return null;
    }
  }

  if (token && projectId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!payload.sub) return null;
      return { role: "project_editor", userId: payload.sub, projectId };
    } catch {
      return null;
    }
  }

  // ── Viewer path (present mode) ──────────────────────────────────────────
  if (joinCode) {
    const incident = await fetcher.fetchByCode(joinCode);
    if (!incident) return null;
    return { role: "viewer", userId: randomUUID(), incidentId: incident.id };
  }

  return null;
}

/** Production fetcher — calls incident-service over HTTP. */
class MemoryIncidentCache implements IncidentCache {
  private values = new Map<string, { id: string; title: string } | null>();

  async get(joinCode: string): Promise<{ id: string; title: string } | null | undefined> {
    return this.values.get(joinCode);
  }

  async set(joinCode: string, incident: { id: string; title: string } | null): Promise<void> {
    this.values.set(joinCode, incident);
  }
}

export function createDefaultFetcher(options: { cache?: IncidentCache } = {}): IncidentFetcher {
  const incidentCache = options.cache ?? createRedisIncidentCache() ?? new MemoryIncidentCache();

  return {
    async fetchByCode(joinCode) {
      const cached = await incidentCache.get(joinCode);
      if (cached !== undefined) return cached;

      const url = `${process.env.INCIDENT_SERVICE_URL}/incidents/by-code/${joinCode}`;
      try {
        const res = await fetch(url);
        const value = res.ok
          ? ((await res.json()) as { id: string; title: string })
          : null;
        await incidentCache.set(joinCode, value);
        return value;
      } catch {
        return null;
      }
    },
    async fetchSnapshot(incidentId) {
      const baseUrl = process.env.INCIDENT_SERVICE_URL!;
      const tok = process.env.SERVICE_TOKEN!;
      const headers = { Authorization: `Service ${tok}` };
      try {
        const [iRes, bRes] = await Promise.all([
          fetch(`${baseUrl}/internal/incidents/${incidentId}`, { headers }),
          fetch(`${baseUrl}/internal/incidents/${incidentId}/blocks`, {
            headers,
          }),
        ]);
        if (!iRes.ok) return { incident: null, blocks: [] };
        const [incident, blocks] = await Promise.all([
          iRes.json() as Promise<Record<string, unknown>>,
          bRes.json() as Promise<unknown[]>,
        ]);
        return { incident, blocks };
      } catch {
        return { incident: null, blocks: [] };
      }
    },
  };
}
