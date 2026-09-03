import type { Incident, IncidentBlock, IncidentMember, BlockType } from "@CodeTalk/types";

const API_BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(payload.error ?? "Request failed", res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function issueToken(displayName: string): Promise<{ token: string }> {
  return request("/auth/token", { method: "POST", body: { userId: displayName } });
}

export function createIncident(
  token: string,
  input: { title: string; description?: string }
): Promise<Incident> {
  return request("/incidents", { method: "POST", token, body: input });
}

export function getIncident(token: string, incidentId: string): Promise<Incident> {
  return request(`/incidents/${incidentId}`, { token });
}

export function getIncidentByJoinCode(token: string, joinCode: string): Promise<Incident> {
  return request(`/incidents/join/${joinCode}`, { token });
}

export function resolveIncident(token: string, incidentId: string): Promise<Incident> {
  return request(`/incidents/${incidentId}/resolve`, { method: "PATCH", token });
}

export function addMember(
  token: string,
  incidentId: string,
  userId: string
): Promise<IncidentMember> {
  return request(`/incidents/${incidentId}/members`, { method: "POST", token, body: { userId } });
}

export function listBlocks(token: string, incidentId: string): Promise<IncidentBlock[]> {
  return request(`/incidents/${incidentId}/blocks`, { token });
}

export function createBlock(
  token: string,
  incidentId: string,
  input: { blockType: BlockType; body: string; subject?: string }
): Promise<IncidentBlock> {
  return request(`/incidents/${incidentId}/blocks`, { method: "POST", token, body: input });
}

export function updateBlock(
  token: string,
  incidentId: string,
  blockId: string,
  patch: { body?: string; subject?: string }
): Promise<IncidentBlock> {
  return request(`/incidents/${incidentId}/blocks/${blockId}`, {
    method: "PATCH",
    token,
    body: patch,
  });
}

export function deleteBlock(token: string, incidentId: string, blockId: string): Promise<void> {
  return request(`/incidents/${incidentId}/blocks/${blockId}`, { method: "DELETE", token });
}
