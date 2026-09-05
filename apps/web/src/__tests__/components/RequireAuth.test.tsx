import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "../../components/RequireAuth";
import { useSessionStore } from "../../lib/store/session";

describe("RequireAuth", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: null, userId: null, displayName: null });
  });

  it("redirects to / when there is no session token", () => {
    render(
      <MemoryRouter initialEntries={["/incidents/incident-1"]}>
        <Routes>
          <Route path="/" element={<div>Landing</div>} />
          <Route
            path="/incidents/:id"
            element={
              <RequireAuth>
                <div>Canvas</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Landing")).toBeInTheDocument();
  });

  it("renders children when a session token is present", () => {
    useSessionStore.setState({
      token: "t",
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: "Ada",
    });

    render(
      <MemoryRouter initialEntries={["/incidents/incident-1"]}>
        <Routes>
          <Route path="/" element={<div>Landing</div>} />
          <Route
            path="/incidents/:id"
            element={
              <RequireAuth>
                <div>Canvas</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Canvas")).toBeInTheDocument();
  });

  it("redirects to / when a legacy session has a non-UUID userId", () => {
    useSessionStore.setState({ token: "t", userId: "Akhil Kotturi", displayName: "Akhil Kotturi" });

    render(
      <MemoryRouter initialEntries={["/incidents/new"]}>
        <Routes>
          <Route path="/" element={<div>Landing</div>} />
          <Route
            path="/incidents/new"
            element={
              <RequireAuth>
                <div>Create incident</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Landing")).toBeInTheDocument();
  });
});
