import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../App";
import { useSessionStore } from "../lib/store/session";

jest.mock("../lib/wsClient");

describe("App routing", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: null, userId: null, displayName: null });
  });

  it("renders Landing at /", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("CodeTalk")).toBeInTheDocument();
  });

  it("redirects /incidents/new to Landing when unauthenticated", () => {
    render(
      <MemoryRouter initialEntries={["/incidents/new"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText("CodeTalk")).toBeInTheDocument();
  });

  it("renders PresentMode at /present/:joinCode without requiring auth", () => {
    render(
      <MemoryRouter initialEntries={["/present/ABC123"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.queryByText("CodeTalk")).not.toBeInTheDocument();
  });
});
