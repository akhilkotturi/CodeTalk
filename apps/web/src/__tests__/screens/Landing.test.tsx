import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Landing } from "../../screens/Landing";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient");

describe("Landing", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: null, userId: null, displayName: null });
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("issues a token and stores the session on create", async () => {
    (apiClient.issueToken as jest.Mock).mockResolvedValue({ token: "jwt" });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Your name"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "Create room" }));

    expect(apiClient.issueToken).toHaveBeenCalledWith("Ada");
    expect(useSessionStore.getState()).toMatchObject({
      token: "jwt",
      userId: "Ada",
      displayName: "Ada",
    });
  });

  it("shows an error when joining with a blank code", async () => {
    (apiClient.issueToken as jest.Mock).mockResolvedValue({ token: "jwt" });

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Your name"), "Ada");
    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a room code");
  });

  it("joins an existing incident by code and registers as a member", async () => {
    (apiClient.issueToken as jest.Mock).mockResolvedValue({ token: "jwt" });
    (apiClient.getIncidentByJoinCode as jest.Mock).mockResolvedValue({ id: "incident-1" });
    (apiClient.addMember as jest.Mock).mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Landing />
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Your name"), "Ada");
    await userEvent.type(screen.getByLabelText("Room code"), "abc123");
    await userEvent.click(screen.getByRole("button", { name: "Join" }));

    expect(apiClient.getIncidentByJoinCode).toHaveBeenCalledWith("jwt", "ABC123");
    expect(apiClient.addMember).toHaveBeenCalledWith("jwt", "incident-1", "Ada");
  });
});
