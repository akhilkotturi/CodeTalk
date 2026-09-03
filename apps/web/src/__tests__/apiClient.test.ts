import { issueToken, createBlock, ApiError } from "../lib/apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("issueToken posts displayName and returns the token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "abc.def.ghi" }),
    });

    const result = await issueToken("Ada");

    expect(result).toEqual({ token: "abc.def.ghi" });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/auth/token",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "Ada" }),
      })
    );
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
