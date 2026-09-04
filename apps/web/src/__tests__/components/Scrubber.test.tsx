import { render, screen } from "@testing-library/react";
import { Scrubber } from "../../components/postmortem/Scrubber";

describe("Scrubber", () => {
  it("renders the current position and calls onChange when moved", async () => {
    const onChange = jest.fn();
    render(<Scrubber max={5} value={2} onChange={onChange} />);

    expect(screen.getByText("2 / 5")).toBeInTheDocument();

    const slider = screen.getByLabelText("Timeline position");
    fireChange(slider, "4");

    expect(onChange).toHaveBeenCalledWith(4);
  });
});

function fireChange(element: HTMLElement, value: string) {
  // range inputs don't respond well to userEvent.type. Setting `.value` directly bypasses
  // React's internal value tracker, so onChange never fires unless we go through the native
  // setter and dispatch the "input" event React actually listens to.
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )!.set!;
  nativeInputValueSetter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
