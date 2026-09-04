import { render, screen } from "@testing-library/react";
import { RoomCodeBadge } from "../../components/shared/RoomCodeBadge";

describe("RoomCodeBadge", () => {
  it("renders the join code", () => {
    render(<RoomCodeBadge code="ABC123" />);
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });
});
