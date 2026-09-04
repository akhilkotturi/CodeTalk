import { render, screen } from "@testing-library/react";
import { BlockFeed } from "../../components/canvas/BlockFeed";
import type { IncidentBlock } from "@CodeTalk/types";

function block(overrides: Partial<IncidentBlock>): IncidentBlock {
  return {
    id: "b1",
    incidentId: "incident-1",
    authorId: "ada",
    blockType: "log",
    body: "seeing 500s",
    subject: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("BlockFeed", () => {
  it("renders each block under its type column", () => {
    render(
      <BlockFeed
        blocks={[
          block({ id: "b1", blockType: "log" }),
          block({ id: "b2", blockType: "hypothesis", body: "maybe the DB" }),
        ]}
        readOnly={false}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Log" })).toBeInTheDocument();
    expect(screen.getByText("seeing 500s")).toBeInTheDocument();
    expect(screen.getByText("maybe the DB")).toBeInTheDocument();
  });

  it("hides the composer in read-only mode", () => {
    render(<BlockFeed blocks={[]} readOnly />);
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
  });
});
