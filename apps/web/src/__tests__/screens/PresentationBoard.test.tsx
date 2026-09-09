import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PresentationBoard } from "../../screens/PresentationBoard";
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

describe("PresentationBoard", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: "jwt", userId: project.ownerId, displayName: "Ada" });
    jest.clearAllMocks();
    (apiClient.getProjectPresentation as jest.Mock).mockResolvedValue({
      project,
      taskCounts: { backlog: 2, doing: 1, blocked: 0, done: 4 },
      recentActivity: [{ id: "activity-1", source: "github", title: "ada merged PR Stabilize whiteboard", url: "https://github.com/openai/codetalk/pull/7", actor: "ada", occurredAt: "2026-09-09T12:00:00.000Z", createdAt: "2026-09-09T12:00:00.000Z" }],
      pins: [],
      generatedAt: "2026-09-09T12:00:00.000Z",
    });
    (apiClient.createPresentationPin as jest.Mock).mockResolvedValue({ id: "pin-1" });
  });

  it("turns task progress and activity into a briefing and lets a collaborator add a talking point", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/projects/${project.id}/presentation`]}>
        <Routes><Route path="/projects/:id/presentation" element={<PresentationBoard />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("ada merged PR Stabilize whiteboard")).toBeInTheDocument();
    expect(screen.getByText("4 done")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Talking point"), "Lead with the whiteboard outcome");
    await user.click(screen.getByRole("button", { name: "Add talking point" }));
    expect(apiClient.createPresentationPin).toHaveBeenCalledWith("jwt", project.id, {
      sourceType: "note",
      sourceId: "Lead with the whiteboard outcome",
      note: "Lead with the whiteboard outcome",
    });
  });
});
