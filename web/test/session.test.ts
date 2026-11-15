import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal browser storage for the Spotify client.
const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
});

const { api, checkSession, hasSavedSession, SessionExpiredError } = await import("../src/lib/spotify");

const TOKEN = "ss.token";
const save = (t: object) => store.set(TOKEN, JSON.stringify(t));
const saved = () => JSON.parse(store.get(TOKEN) ?? "null");
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Fake Spotify: token endpoint + API, with call counting. */
function fakeSpotify(opts: { refresh?: "ok" | "invalid"; meWith?: (auth: string) => Response }) {
  const calls = { refresh: 0, api: 0 };
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/api/token")) {
      calls.refresh++;
      await new Promise((r) => setTimeout(r, 5));
      if (opts.refresh === "invalid") return json(400, { error: "invalid_grant", error_description: "Refresh token revoked" });
      return json(200, { access_token: `fresh${calls.refresh}`, refresh_token: `rt${calls.refresh}`, expires_in: 3600 });
    }
    calls.api++;
    const auth = String((init?.headers as Record<string, string>).Authorization);
    return opts.meWith ? opts.meWith(auth) : json(200, { id: "u1", display_name: "Test User" });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

beforeEach(() => store.clear());

describe("Spotify session handling", () => {
  it("refreshes an expired token and keeps the rotated refresh token", async () => {
    save({ access_token: "old", refresh_token: "rt0", expires_at: Date.now() - 1000, client_id: "abc" });
    const { fetchImpl, calls } = fakeSpotify({ refresh: "ok" });
    await api("GET", "/me", undefined, fetchImpl);
    expect(calls.refresh).toBe(1);
    expect(saved()).toMatchObject({ access_token: "fresh1", refresh_token: "rt1", client_id: "abc" });
  });

  it("shares one refresh between concurrent calls", async () => {
    save({ access_token: "old", refresh_token: "rt0", expires_at: Date.now() - 1000 });
    const { fetchImpl, calls } = fakeSpotify({ refresh: "ok" });
    await Promise.all([api("GET", "/me", undefined, fetchImpl), api("GET", "/me", undefined, fetchImpl), api("GET", "/me", undefined, fetchImpl)]);
    expect(calls.refresh).toBe(1);
  });

  it("clears the session and asks to reconnect when Spotify refuses the refresh", async () => {
    save({ access_token: "old", refresh_token: "rt0", expires_at: Date.now() - 1000 });
    const { fetchImpl } = fakeSpotify({ refresh: "invalid" });
    await expect(api("GET", "/me", undefined, fetchImpl)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(hasSavedSession()).toBe(false);
  });

  it("recovers from a 401 mid-run by refreshing once", async () => {
    save({ access_token: "revoked", refresh_token: "rt0", expires_at: Date.now() + 3600_000 });
    const { fetchImpl, calls } = fakeSpotify({ refresh: "ok", meWith: (auth) => (auth.includes("revoked") ? json(401, {}) : json(200, { id: "u1" })) });
    await expect(api("GET", "/me", undefined, fetchImpl)).resolves.toMatchObject({ id: "u1" });
    expect(calls.refresh).toBe(1);
  });

  it("gives up cleanly when a refreshed token is still rejected", async () => {
    save({ access_token: "bad", refresh_token: "rt0", expires_at: Date.now() + 3600_000 });
    const { fetchImpl } = fakeSpotify({ refresh: "ok", meWith: () => json(401, {}) });
    await expect(api("GET", "/me", undefined, fetchImpl)).rejects.toBeInstanceOf(SessionExpiredError);
    expect(hasSavedSession()).toBe(false);
  });

  it("checkSession reports who is connected, or that they need to reconnect", async () => {
    save({ access_token: "ok", refresh_token: "rt0", expires_at: Date.now() + 3600_000 });
    expect(await checkSession(fakeSpotify({}).fetchImpl)).toEqual({ ok: true, name: "Test User" });
    save({ access_token: "old", refresh_token: "rt0", expires_at: Date.now() - 1000 });
    const res = await checkSession(fakeSpotify({ refresh: "invalid" }).fetchImpl);
    expect(res.ok).toBe(false);
    expect(await checkSession(fakeSpotify({}).fetchImpl)).toEqual({ ok: false }); // nothing saved any more
  });
});
