import { render, screen, fireEvent } from "@testing-library/react";
import { CursorOverlay } from "../../components/presence/CursorOverlay";
import { useCursorsStore } from "../../lib/store/cursors";
import * as wsClient from "../../lib/wsClient";

jest.mock("../../lib/wsClient");

describe("CursorOverlay", () => {
  beforeEach(() => {
    useCursorsStore.getState().reset();
    jest.clearAllMocks();
  });

  it("renders a dot for every tracked cursor position", () => {
    useCursorsStore.getState().setCursor("grace", 0.5, 0.25);

    render(
      <CursorOverlay>
        <div>content</div>
      </CursorOverlay>
    );

    expect(screen.getByTestId("cursor-grace")).toBeInTheDocument();
  });

  it("sends a normalised cursor position on mouse move", () => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 200,
      bottom: 100,
      width: 200,
      height: 100,
      toJSON: () => {},
    });

    render(
      <CursorOverlay>
        <div>content</div>
      </CursorOverlay>
    );

    fireEvent.mouseMove(screen.getByText("content").parentElement!, { clientX: 50, clientY: 50 });

    expect(wsClient.sendCursorMove).toHaveBeenCalledWith(0.25, 0.5);
  });
});
