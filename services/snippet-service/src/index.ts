import "dotenv/config";
import { app } from "./app";

const port = process.env.PORT ?? 4001;

app.listen(port, () => {
  console.log(`snippet-service listening on port ${port}`);
});
