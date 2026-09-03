import {
  MEMBERSHIP_EXCHANGE,
  MEMBERSHIP_QUEUE,
  parseMembershipEventBuffer,
} from "./events";

type AmqpConnect = (url: string) => Promise<AmqpConnection>;

type AmqpConnection = {
  createChannel(): Promise<AmqpChannel>;
};

type AmqpChannel = {
  assertExchange(
    exchange: string,
    type: "topic",
    options: { durable: boolean }
  ): Promise<unknown>;
  assertQueue(queue: string, options: { durable: boolean }): Promise<unknown>;
  bindQueue(queue: string, exchange: string, routingKey: string): Promise<void>;
  consume(
    queue: string,
    handler: (message: AmqpMessage | null) => void,
    options: { noAck: boolean }
  ): Promise<unknown>;
  ack(message: AmqpMessage): void;
  nack(message: AmqpMessage, allUpTo?: boolean, requeue?: boolean): void;
};

type AmqpMessage = {
  content: Buffer;
};

export async function startMembershipConsumer(options: {
  amqpUrl: string;
  connect?: AmqpConnect;
  log?: Pick<Console, "log" | "error">;
}): Promise<void> {
  const connect = options.connect ?? loadAmqpConnect();
  const log = options.log ?? console;
  const connection = await connect(options.amqpUrl);
  const channel = await connection.createChannel();

  await channel.assertExchange(MEMBERSHIP_EXCHANGE, "topic", {
    durable: true,
  });
  await channel.assertQueue(MEMBERSHIP_QUEUE, { durable: true });
  await channel.bindQueue(MEMBERSHIP_QUEUE, MEMBERSHIP_EXCHANGE, "membership.*");
  await channel.consume(
    MEMBERSHIP_QUEUE,
    (message) => {
      if (!message) return;
      try {
        const event = parseMembershipEventBuffer(message.content);
        log.log("membership notification event", event);
        channel.ack(message);
      } catch (err) {
        log.error("invalid membership notification event", err);
        channel.nack(message, false, false);
      }
    },
    { noAck: false }
  );
}

function loadAmqpConnect(): AmqpConnect {
  const amqp = require("amqplib") as { connect: AmqpConnect };
  return amqp.connect;
}
