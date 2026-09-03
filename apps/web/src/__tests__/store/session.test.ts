import { useSessionStore, hydrateSessionFromStorage } from "../../lib/store/session";

describe("session store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ token: null, userId: null, displayName: null });
  });

  it("setSession stores session and persists to localStorage", () => {
    useSessionStore.getState().setSession({ token: "t", userId: "ada", displayName: "Ada" });

    expect(useSessionStore.getState()).toMatchObject({
      token: "t",
      userId: "ada",
      displayName: "Ada",
    });
    expect(JSON.parse(localStorage.getItem("codetalk.session")!)).toEqual({
      token: "t",
      userId: "ada",
      displayName: "Ada",
    });
  });

  it("clearSession resets state and localStorage", () => {
    useSessionStore.getState().setSession({ token: "t", userId: "ada", displayName: "Ada" });
    useSessionStore.getState().clearSession();

    expect(useSessionStore.getState().token).toBeNull();
    expect(localStorage.getItem("codetalk.session")).toBeNull();
  });

  it("hydrateSessionFromStorage restores a persisted session", () => {
    localStorage.setItem(
      "codetalk.session",
      JSON.stringify({ token: "t2", userId: "grace", displayName: "Grace" })
    );

    hydrateSessionFromStorage();

    expect(useSessionStore.getState()).toMatchObject({
      token: "t2",
      userId: "grace",
      displayName: "Grace",
    });
  });
});
