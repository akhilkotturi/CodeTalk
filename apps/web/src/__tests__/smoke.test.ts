describe("apps/web toolchain", () => {
  it("runs TypeScript + Jest + jsdom together", () => {
    const container = document.createElement("div");
    container.textContent = "ready";
    expect(container.textContent).toBe("ready");
  });
});
