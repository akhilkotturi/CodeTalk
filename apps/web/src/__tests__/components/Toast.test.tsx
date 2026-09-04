import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "../../components/shared/Toast";

describe("Toast", () => {
  it("renders the message and calls onDismiss", async () => {
    const onDismiss = jest.fn();
    render(<Toast message="title is required" variant="error" onDismiss={onDismiss} />);

    expect(screen.getByRole("alert")).toHaveTextContent("title is required");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
