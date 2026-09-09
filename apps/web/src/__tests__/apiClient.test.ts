import { issueToken, createBlock, ApiError, GITHUB_SIGN_IN_URL } from "../lib/apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("points GitHub sign-in at the API auth route", () => {
    expect(GITHUB_SIGN_IN_URL).toBe("/api/auth/github/start");
  });

  it("issueToken posts displayName and returns the token for explicit dev auth", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "abc.def.ghi" }),
    });

    const result = await issueToken("Ada");

    expect(result).toEqual({ token: "abc.def.ghi" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "Ada" }),
      })
    );
  });

  it("throws a readable ApiError when a route returns HTML instead of JSON", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
      text: async () => "<!doctype html><html></html>",
    });

    await expect(issueToken("Ada")).rejects.toMatchObject({
      name: "ApiError",
      message: "Expected JSON from API but received text/html",
      status: 200,
    });
  });

  it("throws ApiError with the server's message on failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "title is required" }),
    });

    await expect(
      createBlock("token", "incident-1", { blockType: "log", body: "" })
    ).rejects.toThrow(ApiError);
  });
});
