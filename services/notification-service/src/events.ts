export const MEMBERSHIP_EXCHANGE = "codetalk.membership";
export const MEMBERSHIP_QUEUE = "notification-service.membership";

export type MembershipEventType = "joined" | "left";

export type MembershipEventMessage = {
  version: 1;
  source: "incident-service";
  incidentId: string;
  userId: string;
  eventType: MembershipEventType;
  occurredAt: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMembershipEventMessage(
  value: unknown
): MembershipEventMessage {
  if (!isRecord(value)) {
    throw new Error("membership event must be an object");
  }
  if (value.version !== 1) {
    throw new Error("membership event version must be 1");
  }
  if (value.source !== "incident-service") {
    throw new Error("membership event source must be incident-service");
  }
  if (!isUuid(value.incidentId)) {
    throw new Error("membership event incidentId must be a UUID");
  }
  if (!isUuid(value.userId)) {
    throw new Error("membership event userId must be a UUID");
  }
  if (value.eventType !== "joined" && value.eventType !== "left") {
    throw new Error("membership event eventType must be joined or left");
  }
  if (
    typeof value.occurredAt !== "string" ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    throw new Error("membership event occurredAt must be an ISO date string");
  }

  return {
    version: value.version,
    source: value.source,
    incidentId: value.incidentId,
    userId: value.userId,
    eventType: value.eventType,
    occurredAt: value.occurredAt,
  };
}

export function parseMembershipEventBuffer(
  content: Buffer
): MembershipEventMessage {
  return parseMembershipEventMessage(JSON.parse(content.toString("utf8")));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
