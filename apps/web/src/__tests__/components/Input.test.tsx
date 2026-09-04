import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../../components/shared/Input";

describe("Input", () => {
  it("associates the label with the input via id", async () => {
    const onChange = jest.fn();
    render(<Input label="Display name" onChange={onChange} value="" />);

    const field = screen.getByLabelText("Display name");
    await userEvent.type(field, "Ada");

    expect(onChange).toHaveBeenCalled();
  });
});
