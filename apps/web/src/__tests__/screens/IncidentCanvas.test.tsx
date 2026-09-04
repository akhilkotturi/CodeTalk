import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { IncidentCanvas } from "../../screens/IncidentCanvas";
import { useRoomStore } from "../../lib/store/room";
import { useSessionStore } from "../../lib/store/session";
import * as wsClient from "../../lib/wsClient";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/wsClient");
jest.mock("../../lib/apiClient");

const incident = {
  id: "incident-1",
  title: "DB is down",
  description: null,
  ownerId: "ada",
  joinCode: "ABC123",
  status: "active" as const,
  createdAt: "2026-09-03T00:00:00.000Z",
  resolvedAt: null,
};

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/incidents/incident-1"]}>
      <Routes>
        <Route path="/incidents/:id" element={<IncidentCanvas />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("IncidentCanvas", () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
    useSessionStore.setState({ token: "jwt", userId: "ada", displayName: "Ada" });
    jest.clearAllMocks();
    useRoomStore.getState().applySnapshot(incident, []);
  });

  it("connects with editor role using the route's incident id and session token", () => {
    renderScreen();

    expect(wsClient.connect).toHaveBeenCalledWith(
      { role: "editor", token: "jwt", incidentId: "incident-1" },
      expect.objectContaining({ onOpen: expect.any(Function), onReconnecting: expect.any(Function) })
    );
  });

  it("creating a block posts via apiClient and broadcasts the event over the socket", async () => {
    (apiClient.createBlock as jest.Mock).mockResolvedValue({
      id: "block-1",
      incidentId: "incident-1",
      authorId: "ada",
      blockType: "log",
      body: "seeing 500s",
      subject: null,
      createdAt: "2026-09-03T00:01:00.000Z",
    });

    renderScreen();

    await userEvent.type(screen.getByLabelText("Block body"), "seeing 500s");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("seeing 500s")).toBeInTheDocument();
    expect(wsClient.sendBlockEvent).toHaveBeenCalledWith(
      "block-1",
      "created",
      expect.objectContaining({ id: "block-1" })
    );
  });

  it("resolving the incident calls the API and hides the Resolve button", async () => {
    (apiClient.resolveIncident as jest.Mock).mockResolvedValue({
      ...incident,
      status: "resolved",
      resolvedAt: "2026-09-03T02:00:00.000Z",
    });

    renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));

    expect(apiClient.resolveIncident).toHaveBeenCalledWith("jwt", "incident-1");
    expect(screen.queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  });
});
