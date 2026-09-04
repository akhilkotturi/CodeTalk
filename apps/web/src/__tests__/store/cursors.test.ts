import { useCursorsStore } from "../../lib/store/cursors";

describe("cursors store", () => {
  beforeEach(() => {
    useCursorsStore.getState().reset();
  });

  it("setCursor records a position by userId", () => {
    useCursorsStore.getState().setCursor("grace", 0.5, 0.25);

    expect(useCursorsStore.getState().positions).toEqual({ grace: { x: 0.5, y: 0.25 } });
  });

  it("setCursor overwrites a previous position for the same user", () => {
    useCursorsStore.getState().setCursor("grace", 0.5, 0.25);
    useCursorsStore.getState().setCursor("grace", 0.1, 0.9);

    expect(useCursorsStore.getState().positions).toEqual({ grace: { x: 0.1, y: 0.9 } });
  });

  it("removeCursor deletes a user's position", () => {
    useCursorsStore.getState().setCursor("grace", 0.5, 0.25);
    useCursorsStore.getState().removeCursor("grace");

    expect(useCursorsStore.getState().positions).toEqual({});
  });
});
