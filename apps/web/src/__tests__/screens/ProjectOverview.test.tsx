import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProjectOverview } from "../../screens/ProjectOverview";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient");

const project = {
  id: "00000000-0000-4000-8000-000000000111",
  name: "Launch weekend",
  description: "Ship the demo",
  ownerId: "00000000-0000-4000-8000-000000000001",
  joinCode: "ABC123",
  createdAt: "2026-09-05T00:00:00.000Z",
  role: "owner" as const,
};

describe("ProjectOverview", () => {
  beforeEach(() => {
    useSessionStore.setState({
      token: "jwt",
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: "Ada",
    });
    jest.clearAllMocks();
  });

  it("links to every implemented command-center surface", async () => {
    (apiClient.getProject as jest.Mock).mockResolvedValue(project);

    render(
      <MemoryRouter initialEntries={[`/projects/${project.id}/overview`]}>
        <Routes>
          <Route path="/projects/:id/overview" element={<ProjectOverview />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("link", { name: /plan/i })).toHaveAttribute(
      "href",
      `/projects/${project.id}/plan`
    );
    expect(screen.getByRole("link", { name: /tasks/i })).toHaveAttribute(
      "href",
      `/projects/${project.id}/tasks`
    );
    expect(screen.getByRole("link", { name: /whiteboard/i })).toHaveAttribute(
      "href",
      `/projects/${project.id}/whiteboard`
    );
    expect(screen.getByRole("link", { name: /github activity/i })).toHaveAttribute(
      "href",
      `/projects/${project.id}/activity`
    );
    expect(screen.getByRole("link", { name: /presentation board/i })).toHaveAttribute(
      "href",
      `/projects/${project.id}/presentation`
    );
  });
});
