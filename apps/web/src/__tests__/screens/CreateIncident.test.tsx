import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CreateIncident } from "../../screens/CreateIncident";
import { useSessionStore } from "../../lib/store/session";
import * as apiClient from "../../lib/apiClient";

jest.mock("../../lib/apiClient");

describe("CreateIncident", () => {
  beforeEach(() => {
    useSessionStore.setState({ token: "jwt", userId: "ada", displayName: "Ada" });
    jest.clearAllMocks();
  });

  it("creates the incident and navigates to its canvas route", async () => {
    (apiClient.createIncident as jest.Mock).mockResolvedValue({ id: "incident-1" });

    render(
      <MemoryRouter initialEntries={["/incidents/new"]}>
        <Routes>
          <Route path="/incidents/new" element={<CreateIncident />} />
          <Route path="/incidents/:id" element={<div>Canvas incident-1</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText("Title"), "DB is down");
    await userEvent.click(screen.getByRole("button", { name: "Start incident" }));

    expect(await screen.findByText("Canvas incident-1")).toBeInTheDocument();
    expect(apiClient.createIncident).toHaveBeenCalledWith("jwt", {
      title: "DB is down",
      description: undefined,
    });
  });

  it("shows an error and stays on the form when creation fails", async () => {
    (apiClient.createIncident as jest.Mock).mockRejectedValue(new Error("title is required"));

    render(
      <MemoryRouter initialEntries={["/incidents/new"]}>
        <Routes>
          <Route path="/incidents/new" element={<CreateIncident />} />
          <Route path="/incidents/:id" element={<div>Canvas</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByRole("button", { name: "Start incident" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("title is required");
  });
});
