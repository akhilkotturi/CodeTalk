import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthCallback } from "../../screens/AuthCallback";
import { useSessionStore } from "../../lib/store/session";

describe("AuthCallback", () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ token: null, userId: null, displayName: null, githubLogin: null });
  });

  it("stores the GitHub session and moves the user to projects", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?token=jwt&userId=user-1&displayName=Ada%20Lovelace&githubLogin=ada"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/projects" element={<div>Projects dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Projects dashboard")).toBeInTheDocument());

    expect(useSessionStore.getState()).toMatchObject({
      token: "jwt",
      userId: "user-1",
      displayName: "Ada Lovelace",
      githubLogin: "ada",
    });
  });

  it("shows an error when GitHub does not return a complete session", () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?token=jwt"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("GitHub sign-in did not return a complete session.");
  });
});
