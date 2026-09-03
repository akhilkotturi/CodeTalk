import {
  MEMBERSHIP_EXCHANGE,
  buildMembershipEventMessage,
  publishMembershipEvent,
} from "../events/membershipPublisher";

describe("membership event publisher", () => {
  it("builds a versioned membership event payload", () => {
    const message = buildMembershipEventMessage({
      incidentId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      eventType: "joined",
      occurredAt: new Date("2026-09-03T10:11:12.000Z"),
    });

    expect(message).toEqual({
      version: 1,
      source: "incident-service",
      incidentId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      eventType: "joined",
      occurredAt: "2026-09-03T10:11:12.000Z",
    });
  });

  it("publishes membership events to the membership exchange", async () => {
    const assertExchange = jest.fn().mockResolvedValue(undefined);
    const publish = jest.fn().mockReturnValue(true);
    const closeChannel = jest.fn().mockResolvedValue(undefined);
    const closeConnection = jest.fn().mockResolvedValue(undefined);
    const createChannel = jest.fn().mockResolvedValue({
      assertExchange,
      publish,
      close: closeChannel,
    });
    const connect = jest.fn().mockResolvedValue({
      createChannel,
      close: closeConnection,
    });

    await publishMembershipEvent(
      {
        incidentId: "00000000-0000-0000-0000-000000000001",
        userId: "00000000-0000-0000-0000-000000000002",
        eventType: "left",
        occurredAt: new Date("2026-09-03T10:11:12.000Z"),
      },
      { amqpUrl: "amqp://rabbitmq:5672", connect }
    );

    expect(connect).toHaveBeenCalledWith("amqp://rabbitmq:5672");
    expect(assertExchange).toHaveBeenCalledWith(MEMBERSHIP_EXCHANGE, "topic", {
      durable: true,
    });
    expect(publish).toHaveBeenCalledWith(
      MEMBERSHIP_EXCHANGE,
      "membership.left",
      Buffer.from(
        JSON.stringify({
          version: 1,
          source: "incident-service",
          incidentId: "00000000-0000-0000-0000-000000000001",
          userId: "00000000-0000-0000-0000-000000000002",
          eventType: "left",
          occurredAt: "2026-09-03T10:11:12.000Z",
        })
      ),
      { contentType: "application/json", persistent: true }
    );
    expect(closeChannel).toHaveBeenCalledTimes(1);
    expect(closeConnection).toHaveBeenCalledTimes(1);
  });

  it("uses membership.joined as the joined routing key", async () => {
    const publish = jest.fn().mockReturnValue(true);
    const connect = jest.fn().mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertExchange: jest.fn().mockResolvedValue(undefined),
        publish,
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    });

    await publishMembershipEvent(
      {
        incidentId: "00000000-0000-0000-0000-000000000001",
        userId: "00000000-0000-0000-0000-000000000002",
        eventType: "joined",
        occurredAt: new Date("2026-09-03T10:11:12.000Z"),
      },
      { amqpUrl: "amqp://rabbitmq:5672", connect }
    );

    expect(publish).toHaveBeenCalledWith(
      MEMBERSHIP_EXCHANGE,
      "membership.joined",
      expect.any(Buffer),
      { contentType: "application/json", persistent: true }
    );
  });
});
