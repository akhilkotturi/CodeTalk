import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    jest.spyOn(window, "confirm").mockReturnValue(true);
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

  it("lets owners delete a project from the dashboard", async () => {
    (apiClient.listProjects as jest.Mock).mockResolvedValue(projects);
    (apiClient.deleteProject as jest.Mock).mockResolvedValue(undefined);

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Routes>
          <Route path="/projects" element={<ProjectsDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Launch weekend");
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    expect(apiClient.deleteProject).toHaveBeenCalledWith("jwt", projects[0].id);
    expect(screen.queryByText("Launch weekend")).not.toBeInTheDocument();
    expect(screen.getByText("No active projects")).toBeInTheDocument();
  });


  it("keeps an owner project when delete confirmation is canceled", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    (apiClient.listProjects as jest.Mock).mockResolvedValue(projects);

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Routes>
          <Route path="/projects" element={<ProjectsDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Launch weekend");
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    expect(apiClient.deleteProject).not.toHaveBeenCalled();
    expect(screen.getByText("Launch weekend")).toBeInTheDocument();
  });

  it("does not show delete actions for non-owner projects", async () => {
    (apiClient.listProjects as jest.Mock).mockResolvedValue([{ ...projects[0], role: "editor" }]);

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Routes>
          <Route path="/projects" element={<ProjectsDashboard />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText("Launch weekend");

    expect(screen.queryByRole("button", { name: "Delete project" })).not.toBeInTheDocument();
  });

});
