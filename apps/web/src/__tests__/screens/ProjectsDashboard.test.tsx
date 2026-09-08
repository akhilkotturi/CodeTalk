import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProjectsDashboard } from "../../screens/ProjectsDashboard";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient");

const projects = [
  {
    id: "00000000-0000-4000-8000-000000000111",
    name: "Launch weekend",
    description: "Ship the demo",
    ownerId: "00000000-0000-4000-8000-000000000001",
    joinCode: "ABC123",
    createdAt: "2026-09-05T00:00:00.000Z",
    role: "owner" as const,
  },
];

describe("ProjectsDashboard", () => {
  beforeEach(() => {
    useSessionStore.setState({
      token: "jwt",
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: "Ada",
    });
    jest.clearAllMocks();
  });

  it("shows active projects with shortcuts to plan, whiteboard, and tasks", async () => {
    (apiClient.listProjects as jest.Mock).mockResolvedValue(projects);

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Routes>
          <Route path="/projects" element={<ProjectsDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Launch weekend")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("href", `/projects/${projects[0].id}/plan`);
    expect(screen.getByRole("link", { name: "Whiteboard" })).toHaveAttribute("href", `/projects/${projects[0].id}/whiteboard`);
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", `/projects/${projects[0].id}/tasks`);
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
  });
});
