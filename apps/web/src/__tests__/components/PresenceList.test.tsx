import { render, screen } from "@testing-library/react";
import { PresenceList } from "../../components/presence/PresenceList";

describe("PresenceList", () => {
  it("renders a list item per member", () => {
    render(
      <PresenceList
        members={[
          { userId: "ada", role: "editor" },
          { userId: "grace", role: "viewer" },
        ]}
      />
    );

    expect(screen.getByText("ada · editor")).toBeInTheDocument();
    expect(screen.getByText("grace · viewer")).toBeInTheDocument();
  });
});
