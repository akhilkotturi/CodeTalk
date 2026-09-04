import { render, screen } from "@testing-library/react";
import { PlaybackFeed } from "../../components/postmortem/PlaybackFeed";
import type { IncidentBlock } from "@CodeTalk/types";

function block(overrides: Partial<IncidentBlock>): IncidentBlock {
  return {
    id: "b1",
    incidentId: "incident-1",
    authorId: "ada",
    blockType: "log",
    body: "first",
    subject: null,
    createdAt: "2026-09-03T00:00:00.000Z",
    ...overrides,
  };
}

describe("PlaybackFeed", () => {
  it("only renders blocks up to revealedCount", () => {
    const blocks = [block({ id: "b1", body: "first" }), block({ id: "b2", body: "second" })];

    render(<PlaybackFeed blocks={blocks} revealedCount={1} />);

    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.queryByText("second")).not.toBeInTheDocument();
  });

  it("never renders composer or edit controls", () => {
    const blocks = [block({ id: "b1" })];

    render(<PlaybackFeed blocks={blocks} revealedCount={1} />);

    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});
