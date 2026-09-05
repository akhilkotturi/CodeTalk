import { createClient, RedisClientType } from "redis";

export interface PresenceEntry {
  userId: string;
  role: "editor" | "viewer" | "project_editor";
}

export interface PresenceStore {
  add(incidentId: string, entry: PresenceEntry): Promise<void>;
  touch(incidentId: string, entry: PresenceEntry): Promise<void>;
  remove(incidentId: string, entry: PresenceEntry): Promise<void>;
}

export interface IncidentCache {
  get(joinCode: string): Promise<{ id: string; title: string } | null | undefined>;
  set(joinCode: string, incident: { id: string; title: string } | null): Promise<void>;
}

const PRESENCE_TTL_SECONDS = 30;

function presenceKey(incidentId: string, userId: string): string {
  return `codetalk:presence:${incidentId}:${userId}`;
}

export class RedisPresenceStore implements PresenceStore {
  constructor(private readonly client: RedisClientType) {}

  async add(incidentId: string, entry: PresenceEntry): Promise<void> {
    await this.client.set(presenceKey(incidentId, entry.userId), JSON.stringify(entry), {
      EX: PRESENCE_TTL_SECONDS,
    });
  }

  async remove(incidentId: string, entry: PresenceEntry): Promise<void> {
    await this.client.del(presenceKey(incidentId, entry.userId));
  }

  async touch(incidentId: string, entry: PresenceEntry): Promise<void> {
    await this.client.expire(
      presenceKey(incidentId, entry.userId),
      PRESENCE_TTL_SECONDS
    );
  }
}

export class RedisIncidentCache implements IncidentCache {
  constructor(private readonly client: RedisClientType) {}

  async get(joinCode: string): Promise<{ id: string; title: string } | null | undefined> {
    const value = await this.client.get(`codetalk:incident:${joinCode}`);
    return value === null ? undefined : (JSON.parse(value) as { id: string; title: string } | null);
  }

  async set(joinCode: string, incident: { id: string; title: string } | null): Promise<void> {
    await this.client.set(`codetalk:incident:${joinCode}`, JSON.stringify(incident), {
      EX: PRESENCE_TTL_SECONDS,
    });
  }
}

export function createRedisPresenceStore(): RedisPresenceStore | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;

  const client = createClient({ url });
  client.on("error", (error) => {
    console.error("Redis presence error", error);
  });
  void client.connect().catch((error) => {
    console.error("Redis presence connection failed", error);
  });
  return new RedisPresenceStore(client);
}

export function createRedisIncidentCache(): RedisIncidentCache | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;

  const client = createClient({ url });
  client.on("error", (error) => {
    console.error("Redis incident cache error", error);
  });
  void client.connect().catch((error) => {
    console.error("Redis incident cache connection failed", error);
  });
  return new RedisIncidentCache(client);
}