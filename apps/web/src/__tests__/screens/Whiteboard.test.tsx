import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import * as Y from "yjs";
import { Whiteboard, writeWhiteboardElements } from "../../screens/Whiteboard";
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

describe("Whiteboard", () => {
  beforeEach(() => {
    useSessionStore.setState({
      token: "jwt",
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: "Ada",
    });
    providerEvents.reset();
    jest.clearAllMocks();
  });

  it("opens the shared board and survives a draw event", async () => {
    (apiClient.getProject as jest.Mock).mockResolvedValue(project);

    render(
      <MemoryRouter initialEntries={[`/projects/${project.id}/whiteboard`]}>
        <Routes>
          <Route path="/projects/:id/whiteboard" element={<Whiteboard />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Launch weekend")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mock draw stroke" }));

    expect(screen.getByTestId("excalidraw-mock")).toBeInTheDocument();
    expect(providerEvents.attachedDocuments).toContain(`project:${project.id}:whiteboard`);
    expect(screen.getByRole("link", { name: "Exit whiteboard to project overview" })).toHaveAttribute("href", `/projects/${project.id}/overview`);
    expect(screen.getByRole("link", { name: "Plan" })).toHaveAttribute("href", `/projects/${project.id}/plan`);
  });

  it("stores incoming drawing elements without deleting existing tombstones", () => {
    const doc = new Y.Doc();
    const elements = doc.getMap<any>("elements");
    elements.set("deleted-stroke", { id: "deleted-stroke", isDeleted: true, version: 2 });

    writeWhiteboardElements(elements, [{ id: "stroke-1", isDeleted: false, version: 1 } as any]);

    expect(elements.get("stroke-1")).toEqual({ id: "stroke-1", isDeleted: false, version: 1 });
    expect(elements.get("deleted-stroke")).toEqual({ id: "deleted-stroke", isDeleted: true, version: 2 });
  });
});
