import { render, screen } from "@testing-library/react";
import { ReconnectBanner } from "../../components/shared/ReconnectBanner";

describe("ReconnectBanner", () => {
  it("renders a reconnecting status message", () => {
    render(<ReconnectBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting");
  });
});
