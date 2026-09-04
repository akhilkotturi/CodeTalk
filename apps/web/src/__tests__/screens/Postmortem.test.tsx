import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Postmortem } from "../../screens/Postmortem";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient");

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/incidents/incident-1/postmortem"]}>
      <Routes>
        <Route path="/incidents/:id/postmortem" element={<Postmortem />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Postmortem", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: "jwt", userId: "ada", displayName: "Ada" });
    jest.clearAllMocks();
  });

  it("shows a scrubber and the full block feed for a resolved incident", async () => {
    (apiClient.getIncident as jest.Mock).mockResolvedValue({
      id: "incident-1",
      title: "DB is down",
      status: "resolved",
    });
    (apiClient.listBlocks as jest.Mock).mockResolvedValue([
      {
        id: "b1",
        incidentId: "incident-1",
        authorId: "ada",
        blockType: "log",
        body: "seeing 500s",
        subject: null,
        createdAt: "2026-09-03T00:00:00.000Z",
      },
    ]);

    renderScreen();

    expect(await screen.findByLabelText("Timeline position")).toBeInTheDocument();
    expect(screen.getByText("seeing 500s")).toBeInTheDocument();
  });

  it("shows a guard message when the incident is still active", async () => {
    (apiClient.getIncident as jest.Mock).mockResolvedValue({
      id: "incident-1",
      title: "DB is down",
      status: "active",
    });
    (apiClient.listBlocks as jest.Mock).mockResolvedValue([]);

    renderScreen();

    expect(
      await screen.findByText("Postmortem is available once this incident is resolved.")
    ).toBeInTheDocument();
  });
});
