import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

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
  | { role: "viewer"; userId: string; incidentId: string };

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

  // ── Viewer path (present mode) ──────────────────────────────────────────
  if (joinCode) {
    const incident = await fetcher.fetchByCode(joinCode);
    if (!incident) return null;
    return { role: "viewer", userId: randomUUID(), incidentId: incident.id };
  }

  return null;
}

/** Production fetcher — calls incident-service over HTTP. */
export function createDefaultFetcher(): IncidentFetcher {
  return {
    async fetchByCode(joinCode) {
      const url = `${process.env.INCIDENT_SERVICE_URL}/incidents/by-code/${joinCode}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return (await res.json()) as { id: string; title: string };
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
