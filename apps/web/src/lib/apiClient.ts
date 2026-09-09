import type { Incident, IncidentBlock, IncidentMember, BlockType, PresentationPin, ProjectActivityItem, ProjectRepository, ProjectTask } from "@CodeTalk/types";
import { API_BASE_URL } from "./config";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  joinCode: string;
  createdAt: string;
  role: "owner" | "editor" | "viewer";
}


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

  if (res.status === 204) return undefined as T;

  const contentType = res.headers?.get("content-type") ?? "application/json";
  if (!contentType.includes("application/json")) {
    await res.text().catch(() => "");
    throw new ApiError(`Expected JSON from API but received ${contentType || "an unknown content type"}`, res.status);
  }

  const payload = await res.json();

  if (!res.ok) {
    throw new ApiError(payload.error ?? "Request failed", res.status);
  }

  return payload as T;
}

export const GITHUB_SIGN_IN_URL = `${API_BASE_URL}/auth/github/start`;

export function issueToken(displayName: string): Promise<{ token: string; userId?: string; displayName?: string; githubLogin?: string }> {
  return request("/auth/token", { method: "POST", body: { userId: displayName } });
}

export function createProject(
  token: string,
  input: { name: string; description?: string }
): Promise<Project> {
  return request("/projects", { method: "POST", token, body: input });
}

export function listProjects(token: string): Promise<Project[]> {
  return request("/projects", { token });
}

export function joinProject(token: string, joinCode: string): Promise<Project> {
  return request("/projects/join", { method: "POST", token, body: { joinCode } });
}

export function getProject(token: string, projectId: string): Promise<Project> {
  return request(`/projects/${projectId}`, { token });
}

export function deleteProject(token: string, projectId: string): Promise<void> {
  return request(`/projects/${projectId}`, { method: "DELETE", token });
}

export function listTasks(token: string, projectId: string): Promise<ProjectTask[]> {
  return request(`/projects/${projectId}/tasks`, { token });
}

export function createTask(token: string, projectId: string, input: { title: string; description?: string }): Promise<ProjectTask> {
  return request(`/projects/${projectId}/tasks`, { method: "POST", token, body: input });
}

export function updateTask(token: string, projectId: string, taskId: string, patch: Partial<Pick<ProjectTask, "title" | "description" | "status" | "position">>): Promise<ProjectTask> {
  return request(`/projects/${projectId}/tasks/${taskId}`, { method: "PATCH", token, body: patch });
}

export function deleteTask(token: string, projectId: string, taskId: string): Promise<void> {
  return request(`/projects/${projectId}/tasks/${taskId}`, { method: "DELETE", token });
}

export function listGitHubRepositories(token: string, projectId: string): Promise<ProjectRepository[]> {
  return request(`/projects/${projectId}/github/repositories`, { token });
}

export function connectGitHubRepository(token: string, projectId: string, url: string): Promise<ProjectRepository> {
  return request(`/projects/${projectId}/github/repositories`, { method: "POST", token, body: { url } });
}

export function syncGitHubActivity(token: string, projectId: string): Promise<{ synced: number }> {
  return request(`/projects/${projectId}/github/sync`, { method: "POST", token });
}

export function listProjectActivity(token: string, projectId: string): Promise<ProjectActivityItem[]> {
  return request(`/projects/${projectId}/activity`, { token });
}

export interface ProjectPresentation {
  project: Project;
  taskCounts: Record<"backlog" | "doing" | "blocked" | "done", number>;
  recentActivity: ProjectActivityItem[];
  pins: PresentationPin[];
  generatedAt: string;
}

export function getProjectPresentation(token: string, projectId: string): Promise<ProjectPresentation> {
  return request(`/projects/${projectId}/presentation`, { token });
}

export function createPresentationPin(
  token: string,
  projectId: string,
  input: Pick<PresentationPin, "sourceType" | "sourceId" | "note">
): Promise<PresentationPin> {
  return request(`/projects/${projectId}/presentation/pins`, { method: "POST", token, body: input });
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
