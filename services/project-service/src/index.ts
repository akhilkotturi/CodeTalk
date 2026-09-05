import "dotenv/config";
import { app } from "./app";

const port = Number(process.env.PORT ?? 4004);
app.listen(port, () => console.log(`project-service listening on port ${port}`));
