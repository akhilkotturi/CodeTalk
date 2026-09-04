import { groupBlocksByType, BLOCK_TYPE_ORDER } from "../lib/blockGrouping";
import type { IncidentBlock } from "@CodeTalk/types";

function block(overrides: Partial<IncidentBlock>): IncidentBlock {
  return {
    id: "id-1",
    incidentId: "incident-1",
    authorId: "ada",
    blockType: "log",
    body: "body",
    subject: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("groupBlocksByType", () => {
  it("groups blocks under every known type, in a fixed key order", () => {
    const blocks = [block({ id: "1", blockType: "hypothesis" }), block({ id: "2", blockType: "log" })];

    const groups = groupBlocksByType(blocks);

    expect(Object.keys(groups)).toEqual(BLOCK_TYPE_ORDER);
    expect(groups.log).toEqual([blocks[1]]);
    expect(groups.hypothesis).toEqual([blocks[0]]);
    expect(groups.fix_attempt).toEqual([]);
  });
});
