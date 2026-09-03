import {
  MEMBERSHIP_EXCHANGE,
  parseMembershipEventMessage,
} from "../events";

describe("membership notification events", () => {
  it("accepts a valid versioned membership event", () => {
    const event = parseMembershipEventMessage({
      version: 1,
      source: "incident-service",
      incidentId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      eventType: "joined",
      occurredAt: "2026-09-03T10:11:12.000Z",
    });

    expect(event).toEqual({
      version: 1,
      source: "incident-service",
      incidentId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      eventType: "joined",
      occurredAt: "2026-09-03T10:11:12.000Z",
    });
    expect(MEMBERSHIP_EXCHANGE).toBe("codetalk.membership");
  });

  it("rejects malformed membership events", () => {
    expect(() =>
      parseMembershipEventMessage({
        version: 1,
        source: "incident-service",
        incidentId: "not-a-uuid",
        userId: "00000000-0000-0000-0000-000000000002",
        eventType: "joined",
        occurredAt: "2026-09-03T10:11:12.000Z",
      })
    ).toThrow(/incidentId/i);

    expect(() =>
      parseMembershipEventMessage({
        version: 1,
        source: "incident-service",
        incidentId: "00000000-0000-0000-0000-000000000001",
        userId: "00000000-0000-0000-0000-000000000002",
        eventType: "updated",
        occurredAt: "2026-09-03T10:11:12.000Z",
      })
    ).toThrow(/eventType/i);
  });
});
