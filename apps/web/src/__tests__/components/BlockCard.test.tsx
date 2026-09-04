import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockCard } from "../../components/canvas/BlockCard";
import type { IncidentBlock } from "@CodeTalk/types";

const block: IncidentBlock = {
  id: "block-1",
  incidentId: "incident-1",
  authorId: "ada",
  blockType: "log",
  body: "seeing 500s",
  subject: null,
  createdAt: "2026-09-03T00:00:00.000Z",
};

describe("BlockCard", () => {
  it("renders the block body and hides edit/delete controls in read-only mode", () => {
    render(<BlockCard block={block} readOnly onEdit={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText("seeing 500s")).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("edits the block body and calls onEdit with the new text", async () => {
    const onEdit = jest.fn();
    render(<BlockCard block={block} readOnly={false} onEdit={onEdit} onDelete={jest.fn()} />);

    await userEvent.click(screen.getByText("Edit"));
    const textarea = screen.getByRole("textbox");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "seeing 502s");
    await userEvent.click(screen.getByText("Save"));

    expect(onEdit).toHaveBeenCalledWith("block-1", { body: "seeing 502s" });
  });

  it("calls onDelete when Delete is clicked", async () => {
    const onDelete = jest.fn();
    render(<BlockCard block={block} readOnly={false} onEdit={jest.fn()} onDelete={onDelete} />);

    await userEvent.click(screen.getByText("Delete"));

    expect(onDelete).toHaveBeenCalledWith("block-1");
  });
});
