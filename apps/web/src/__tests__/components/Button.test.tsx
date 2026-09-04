import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../../components/shared/Button";

describe("Button", () => {
  it("renders children and calls onClick when clicked", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Resolve</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Button disabled>Resolve</Button>);
    expect(screen.getByRole("button", { name: "Resolve" })).toBeDisabled();
  });
});
