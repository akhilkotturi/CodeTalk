import "dotenv/config";
import request from "supertest";
import { app } from "../app";
import { truncateAll, createToken } from "./helpers";
import { publishMembershipEvent } from "../events/membershipPublisher";

jest.mock("../events/membershipPublisher", () => ({
  publishMembershipEvent: jest.fn().mockResolvedValue(undefined),
}));

const OWNER_ID = "00000000-0000-0000-0000-000000000001";
const USER_A = "00000000-0000-0000-0000-000000000002";

const ownerToken = () => `Bearer ${createToken(OWNER_ID)}`;

beforeEach(async () => {
  jest.clearAllMocks();
  await truncateAll();
});

afterAll(async () => {
  const { pool } = await import("../db/index");
  await pool.end();
});

async function createIncident(title = "Test incident") {
  const res = await request(app)
    .post("/incidents")
    .set("Authorization", ownerToken())
    .send({ title });
  return res.body as { id: string; joinCode: string };
}

describe("membership event publishing", () => {
  it("publishes a joined event after adding a member", async () => {
    const { id } = await createIncident();

    const res = await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });

    expect(res.status).toBe(201);
    expect(publishMembershipEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: id,
        userId: USER_A,
        eventType: "joined",
      })
    );
  });

  it("publishes a left event after removing a member", async () => {
    const { id } = await createIncident();
    await request(app)
      .post(`/incidents/${id}/members`)
      .set("Authorization", ownerToken())
      .send({ userId: USER_A });
    jest.clearAllMocks();

    const res = await request(app)
      .delete(`/incidents/${id}/members/${USER_A}`)
      .set("Authorization", ownerToken());

    expect(res.status).toBe(200);
    expect(publishMembershipEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: id,
        userId: USER_A,
        eventType: "left",
      })
    );
  });
});
