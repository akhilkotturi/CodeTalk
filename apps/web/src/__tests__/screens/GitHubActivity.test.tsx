import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GitHubActivity } from "../../screens/GitHubActivity";
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

describe("GitHubActivity", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: "jwt", userId: project.ownerId, displayName: "Ada" });
    jest.clearAllMocks();
    (apiClient.getProject as jest.Mock).mockResolvedValue(project);
    (apiClient.listGitHubRepositories as jest.Mock).mockResolvedValue([]);
    (apiClient.listProjectActivity as jest.Mock).mockResolvedValue([
      { id: "activity-1", source: "github", title: "ada pushed Ship board", url: "https://github.com/openai/codetalk", actor: "ada", occurredAt: "2026-09-09T12:00:00.000Z", createdAt: "2026-09-09T12:00:00.000Z" },
    ]);
  });

  it("connects a repository and refreshes the project activity feed", async () => {
    const user = userEvent.setup();
    (apiClient.connectGitHubRepository as jest.Mock).mockResolvedValue({ id: "repo-1", projectId: project.id, owner: "openai", name: "codetalk", url: "https://github.com/openai/codetalk", createdAt: "2026-09-09T00:00:00.000Z" });
    (apiClient.syncGitHubActivity as jest.Mock).mockResolvedValue({ synced: 2 });

    render(
      <MemoryRouter initialEntries={[`/projects/${project.id}/activity`]}>
        <Routes><Route path="/projects/:id/activity" element={<GitHubActivity />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("ada pushed Ship board")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Repository URL"), "https://github.com/openai/codetalk");
    await user.click(screen.getByRole("button", { name: "Connect repository" }));
    expect(apiClient.connectGitHubRepository).toHaveBeenCalledWith("jwt", project.id, "https://github.com/openai/codetalk");
    await user.click(screen.getByRole("button", { name: "Sync GitHub" }));
    expect(apiClient.syncGitHubActivity).toHaveBeenCalledWith("jwt", project.id);
  });
});
