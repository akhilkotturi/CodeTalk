import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Landing } from "../../screens/Landing";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient", () => ({
  GITHUB_SIGN_IN_URL: "/api/auth/github/start",
  getIncidentByJoinCode: jest.fn(),
  addMember: jest.fn(),
  joinProject: jest.fn(),
}));

describe("Landing", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: null, userId: null, displayName: null, githubLogin: null });
    localStorage.clear();
    jest.clearAllMocks();
  });

  function renderLanding() {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/incidents/new" element={<div>New incident</div>} />
          <Route path="/incidents/:id" element={<div>Incident room</div>} />
          <Route path="/projects/new" element={<div>New project</div>} />
          <Route path="/projects/:id/overview" element={<div>Project overview</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it("prompts anonymous users to sign in with GitHub before creating work", () => {
    renderLanding();

    const signInLink = screen.getByRole("link", { name: "Continue with GitHub" });
    expect(signInLink).toHaveAttribute("href", "/api/auth/github/start");
    expect(screen.getByRole("button", { name: "Create project" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create room" })).toBeDisabled();
  });

  it("shows the authenticated GitHub account and allows project creation", async () => {
    useSessionStore.setState({
      token: "jwt",
      userId: "1a66bcaa-2b52-4933-aef4-2f308a3085c4",
      displayName: "Ada Lovelace",
      githubLogin: "ada",
    });

    renderLanding();

    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.getByText("@ada")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("New project")).toBeInTheDocument();
  });

  it("shows an error when joining with a blank code while signed in", async () => {
    useSessionStore.setState({
      token: "jwt",
      userId: "1a66bcaa-2b52-4933-aef4-2f308a3085c4",
      displayName: "Ada Lovelace",
      githubLogin: "ada",
    });

    renderLanding();

    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a room code");
  });

  it("joins an existing incident by code and registers the signed-in user as a member", async () => {
    useSessionStore.setState({
      token: "jwt",
      userId: "1a66bcaa-2b52-4933-aef4-2f308a3085c4",
      displayName: "Ada Lovelace",
      githubLogin: "ada",
    });
    (apiClient.getIncidentByJoinCode as jest.Mock).mockResolvedValue({ id: "incident-1" });
    (apiClient.addMember as jest.Mock).mockResolvedValue({});

    renderLanding();

    await userEvent.type(screen.getByLabelText("Room code"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(apiClient.getIncidentByJoinCode).toHaveBeenCalledWith("jwt", "ABC123");
    expect(apiClient.addMember).toHaveBeenCalledWith("jwt", "incident-1", "1a66bcaa-2b52-4933-aef4-2f308a3085c4");
  });
});
