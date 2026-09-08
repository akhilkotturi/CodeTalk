import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Account } from "../../screens/Account";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient");

describe("Account", () => {
  beforeEach(() => {
    useSessionStore.setState({
      token: "jwt",
      userId: "00000000-0000-4000-8000-000000000001",
      displayName: "Ada",
    });
    localStorage.setItem("codetalk.session", JSON.stringify(useSessionStore.getState()));
    jest.clearAllMocks();
  });

  it("shows account identity and active projects", async () => {
    (apiClient.listProjects as jest.Mock).mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000111",
        name: "Launch weekend",
        description: null,
        ownerId: "00000000-0000-4000-8000-000000000001",
        joinCode: "ABC123",
        createdAt: "2026-09-05T00:00:00.000Z",
        role: "owner",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/account"]}>
        <Routes>
          <Route path="/" element={<div>Landing</div>} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getAllByText("00000000-0000-4000-8000-000000000001")).toHaveLength(2);
    expect(screen.getByText("Launch weekend")).toBeInTheDocument();
  });

  it("clears the session when signing out", async () => {
    (apiClient.listProjects as jest.Mock).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/account"]}>
        <Routes>
          <Route path="/" element={<div>Landing</div>} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(useSessionStore.getState().token).toBeNull();
    expect(localStorage.getItem("codetalk.session")).toBeNull();
    expect(screen.getByText("Landing")).toBeInTheDocument();
  });
});
