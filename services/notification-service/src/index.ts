import "dotenv/config";
import { app } from "./app";
import { startMembershipConsumer } from "./consumer";

const port = process.env.PORT ?? 4003;
const rabbitmqUrl = process.env.RABBITMQ_URL;

app.listen(port, () => {
  console.log(`notification-service listening on port ${port}`);
});

if (rabbitmqUrl) {
  startMembershipConsumer({ amqpUrl: rabbitmqUrl }).catch((err) => {
    console.error("notification-service RabbitMQ consumer failed:", err);
    process.exitCode = 1;
  });
} else {
  console.warn("notification-service started without RABBITMQ_URL");
}
