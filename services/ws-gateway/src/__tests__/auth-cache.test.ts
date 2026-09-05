import { createDefaultFetcher } from "../auth";

describe("incident lookup cache", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reuses an active incident lookup within the cache TTL", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "incident-1", title: "Outage" }),
    } as Response);
    const fetcher = createDefaultFetcher();

    await expect(fetcher.fetchByCode("ABC123")).resolves.toEqual({
      id: "incident-1",
      title: "Outage",
    });
    await expect(fetcher.fetchByCode("ABC123")).resolves.toEqual({
      id: "incident-1",
      title: "Outage",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});