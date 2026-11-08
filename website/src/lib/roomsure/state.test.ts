import { beforeEach, describe, expect, it, vi } from "vitest";

/** Read the store's current state through its public setState (the function form receives it). */
async function freshState() {
  const mod = await import("./state");
  let current: ReturnType<typeof mod.defaultState> | null = null;
  mod.setState((s) => {
    current = s;
    return {};
  });
  return current!;
}

describe("Maya's Passport", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it("starts fully verified (simulated), as the MVP requirements say", async () => {
    expect((await freshState()).checks).toEqual({ email: true, id: true, card: true });
  });

  it("shows the card as verified even in a browser that saved the old state", async () => {
    const { defaultState, STORAGE_KEY } = await import("./state");
    const saved = {
      ...defaultState(),
      destination: "campus",
      checks: { email: true, id: true, card: false },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    vi.resetModules();
    const loaded = await freshState();
    expect(loaded.destination).toBe("campus"); // the saved state really was loaded
    expect(loaded.checks.card).toBe(true);
  });
});
