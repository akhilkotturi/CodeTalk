import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PresentMode } from "../../screens/PresentMode";
import { useRoomStore } from "../../lib/store/room";
import * as wsClient from "../../lib/wsClient";

jest.mock("../../lib/wsClient");

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/present/ABC123"]}>
      <Routes>
        <Route path="/present/:joinCode" element={<PresentMode />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PresentMode", () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
    jest.clearAllMocks();
  });

  it("connects with viewer role using the route's join code", () => {
    renderScreen();

    expect(wsClient.connect).toHaveBeenCalledWith(
      { role: "viewer", joinCode: "ABC123" },
      expect.objectContaining({ onClose: expect.any(Function) })
    );
  });

  it("renders the feed read-only, without a composer", () => {
    useRoomStore.getState().applySnapshot(
      {
        id: "incident-1",
        title: "DB is down",
        description: null,
        ownerId: "ada",
        joinCode: "ABC123",
        status: "active",
        createdAt: "2026-09-03T00:00:00.000Z",
        resolvedAt: null,
      },
      []
    );

    renderScreen();

    expect(screen.getByText("DB is down")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();
  });

  it("shows an invalid-code message when the socket closes with code 4401", () => {
    (wsClient.connect as jest.Mock).mockImplementation((_options, callbacks) => {
      callbacks.onClose(4401);
    });

    renderScreen();

    expect(screen.getByRole("alert")).toHaveTextContent("invalid or no longer active");
  });
});
