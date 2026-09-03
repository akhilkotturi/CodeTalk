export const MEMBERSHIP_EXCHANGE = "codetalk.membership";

export type MembershipEventType = "joined" | "left";

export type MembershipEventInput = {
  incidentId: string;
  userId: string;
  eventType: MembershipEventType;
  occurredAt?: Date;
};

export type MembershipEventMessage = {
  version: 1;
  source: "incident-service";
  incidentId: string;
  userId: string;
  eventType: MembershipEventType;
  occurredAt: string;
};

type PublishOptions = {
  amqpUrl?: string;
  connect?: AmqpConnect;
};

type AmqpConnect = (url: string) => Promise<AmqpConnection>;

type AmqpConnection = {
  createChannel(): Promise<AmqpChannel>;
  close(): Promise<void>;
};

type AmqpChannel = {
  assertExchange(
    exchange: string,
    type: "topic",
    options: { durable: boolean }
  ): Promise<unknown>;
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: { contentType: string; persistent: boolean }
  ): boolean;
  close(): Promise<void>;
};

export function buildMembershipEventMessage(
  input: MembershipEventInput
): MembershipEventMessage {
  return {
    version: 1,
    source: "incident-service",
    incidentId: input.incidentId,
    userId: input.userId,
    eventType: input.eventType,
    occurredAt: (input.occurredAt ?? new Date()).toISOString(),
  };
}

export async function publishMembershipEvent(
  input: MembershipEventInput,
  options: PublishOptions = {}
): Promise<void> {
  const amqpUrl = options.amqpUrl ?? process.env.RABBITMQ_URL;
  if (!amqpUrl) return;

  const connect = options.connect ?? loadAmqpConnect();
  const connection = await connect(amqpUrl);
  const channel = await connection.createChannel();

  try {
    await channel.assertExchange(MEMBERSHIP_EXCHANGE, "topic", {
      durable: true,
    });
    const message = buildMembershipEventMessage(input);
    channel.publish(
      MEMBERSHIP_EXCHANGE,
      `membership.${input.eventType}`,
      Buffer.from(JSON.stringify(message)),
      { contentType: "application/json", persistent: true }
    );
  } finally {
    await channel.close();
    await connection.close();
  }
}

function loadAmqpConnect(): AmqpConnect {
  const amqp = require("amqplib") as { connect: AmqpConnect };
  return amqp.connect;
}
