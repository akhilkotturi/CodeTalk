import request from "supertest";
import { app } from "../app";

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

describe("CORS", () => {
  it("allows browser preflight from an alternate Vite dev port", async () => {
    const res = await request(app)
      .options("/auth/token")
      .set("Origin", "http://localhost:5174")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "Content-Type, Authorization");

    expect(res.status).toBe(204);
    expect(res.header["access-control-allow-origin"]).toBe("http://localhost:5174");
  });
});
