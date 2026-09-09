import { toWebsocketBaseUrl } from "../lib/config";

describe("frontend config", () => {
  it("derives websocket URLs from API URLs", () => {
    expect(toWebsocketBaseUrl("https://api.codetalk.test")).toBe("wss://api.codetalk.test");
    expect(toWebsocketBaseUrl("http://api.codetalk.test")).toBe("ws://api.codetalk.test");
    expect(toWebsocketBaseUrl("wss://realtime.codetalk.test")).toBe("wss://realtime.codetalk.test");
  });
});
