import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PlanningDoc } from "../../screens/PlanningDoc";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";
import { providerEvents } from "../../test/mocks/hocuspocusProvider";

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

describe("PlanningDoc", () => {
  beforeEach(() => {
    useSessionStore.setState({
      token: "jwt",
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: "Ada",
    });
    providerEvents.reset();
    jest.clearAllMocks();
  });

  it("opens the project plan document with rich-text controls", async () => {
    (apiClient.getProject as jest.Mock).mockResolvedValue(project);

    render(
      <MemoryRouter initialEntries={[`/projects/${project.id}/plan`]}>
        <Routes>
          <Route path="/projects/:id/plan" element={<PlanningDoc />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Launch weekend")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Heading" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checklist" })).toBeInTheDocument();
    expect(screen.getByTestId("editor-content")).toHaveAttribute(
      "data-document-name",
      `project:${project.id}:plan`
    );
    expect(providerEvents.attachedDocuments).toContain(`project:${project.id}:plan`);
  });
});
