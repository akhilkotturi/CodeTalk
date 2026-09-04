import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlockComposer } from "../../components/canvas/BlockComposer";

describe("BlockComposer", () => {
  it("submits a log block with the entered body", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<BlockComposer onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Block body"), "seeing 500s");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({
      blockType: "log",
      body: "seeing 500s",
      subject: undefined,
    });
  });

  it("shows a subject field only for custom blocks and includes it on submit", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<BlockComposer onSubmit={onSubmit} />);

    await userEvent.selectOptions(screen.getByLabelText("Block type"), "custom");
    await userEvent.type(screen.getByLabelText("Subject"), "Deploy note");
    await userEvent.type(screen.getByLabelText("Block body"), "rolled back v12");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledWith({
      blockType: "custom",
      body: "rolled back v12",
      subject: "Deploy note",
    });
  });
});
