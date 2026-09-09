import { useSessionStore, hydrateSessionFromStorage } from "../../lib/store/session";

describe("session store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ token: null, userId: null, displayName: null, githubLogin: null });
  });

  it("setSession stores session and persists to localStorage", () => {
    useSessionStore.getState().setSession({ token: "t", userId: "ada", displayName: "Ada", githubLogin: "octoada" });

    expect(useSessionStore.getState()).toMatchObject({
      token: "t",
      userId: "ada",
      displayName: "Ada",
      githubLogin: "octoada",
    });
    expect(JSON.parse(localStorage.getItem("codetalk.session")!)).toEqual({
      token: "t",
      userId: "ada",
      displayName: "Ada",
      githubLogin: "octoada",
    });
  });

  it("clearSession resets state and localStorage", () => {
    useSessionStore.getState().setSession({ token: "t", userId: "ada", displayName: "Ada", githubLogin: "octoada" });
    useSessionStore.getState().clearSession();

    expect(useSessionStore.getState()).toMatchObject({ token: null, userId: null, displayName: null, githubLogin: null });
    expect(localStorage.getItem("codetalk.session")).toBeNull();
  });

  it("hydrateSessionFromStorage restores a persisted session", () => {
    localStorage.setItem(
      "codetalk.session",
      JSON.stringify({ token: "t2", userId: "grace", displayName: "Grace", githubLogin: "hopper" })
    );

    hydrateSessionFromStorage();

    expect(useSessionStore.getState()).toMatchObject({
      token: "t2",
      userId: "grace",
      displayName: "Grace",
      githubLogin: "hopper",
    });
  });

  it("hydrates older sessions without a GitHub login", () => {
    localStorage.setItem(
      "codetalk.session",
      JSON.stringify({ token: "t2", userId: "grace", displayName: "Grace" })
    );

    hydrateSessionFromStorage();

    expect(useSessionStore.getState()).toMatchObject({ githubLogin: null });
  });
});
