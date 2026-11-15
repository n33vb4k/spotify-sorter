/**
 * Browser-side Spotify client: PKCE login with the user's own Client ID, read Liked Songs,
 * create NEW private playlists. It never edits, reorders or deletes anything that already exists.
 */
import type { Track } from "./grouping";

const API = "https://api.spotify.com/v1";
const SCOPES = "user-library-read playlist-read-private playlist-modify-private";
const K = { client: "ss.clientId", verifier: "ss.pkceVerifier", state: "ss.pkceState", token: "ss.token" };

export const redirectUri = () => `${window.location.origin}/callback`;

/** Optional Client ID baked in by whoever deploys the site; users can still bring their own. */
export const BUILTIN_CLIENT_ID = (process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "").trim();
export const isBuiltin = (id: string) => !!BUILTIN_CLIENT_ID && id.trim() === BUILTIN_CLIENT_ID;
export const getClientId = () => localStorage.getItem(K.client) ?? "";
export const setClientId = (id: string) => localStorage.setItem(K.client, id.trim());
export const isValidClientId = (id: string) => /^[0-9a-f]{32}$/i.test(id.trim());

interface Token {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  return { verifier, challenge };
}

export async function beginLogin(clientId: string) {
  setClientId(clientId);
  const { verifier, challenge } = await pkcePair();
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  sessionStorage.setItem(K.verifier, verifier);
  sessionStorage.setItem(K.state, state);
  const q = new URLSearchParams({
    client_id: clientId.trim(),
    response_type: "code",
    redirect_uri: redirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SCOPES,
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${q}`);
}

async function tokenRequest(params: Record<string, string>): Promise<Token> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error_description || body.error || `Spotify login failed (${res.status})`);
  const prev = loadToken();
  const tok: Token = {
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? prev?.refresh_token,
    expires_at: Date.now() + (body.expires_in - 60) * 1000,
  };
  localStorage.setItem(K.token, JSON.stringify(tok));
  return tok;
}

/** Called on /callback. Returns null on success, or a message to show. */
export async function finishLogin(search: URLSearchParams): Promise<string | null> {
  if (search.get("error")) return search.get("error") === "access_denied" ? "You cancelled the Spotify login." : `Spotify said: ${search.get("error")}`;
  const code = search.get("code");
  const verifier = sessionStorage.getItem(K.verifier);
  if (!code || !verifier || search.get("state") !== sessionStorage.getItem(K.state)) return "That login link expired. Start again from Connect.";
  sessionStorage.removeItem(K.verifier);
  sessionStorage.removeItem(K.state);
  try {
    await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri(), client_id: getClientId(), code_verifier: verifier });
    return null;
  } catch (e) {
    return `Couldn't finish logging in: ${(e as Error).message}. Check the redirect URI in your Spotify app matches ${redirectUri()}.`;
  }
}

function loadToken(): Token | null {
  try {
    return JSON.parse(localStorage.getItem(K.token) ?? "null");
  } catch {
    return null;
  }
}

export const isLoggedIn = () => !!loadToken();
export const logout = () => localStorage.removeItem(K.token);
export const forgetClientId = () => localStorage.removeItem(K.client);

async function accessToken(): Promise<string> {
  const tok = loadToken();
  if (!tok) throw new Error("Not connected to Spotify.");
  if (Date.now() < tok.expires_at) return tok.access_token;
  if (!tok.refresh_token) throw new Error("Your Spotify session expired. Connect again.");
  return (await tokenRequest({ grant_type: "refresh_token", refresh_token: tok.refresh_token, client_id: getClientId() })).access_token;
}

/** Development-mode Spotify apps only work for accounts the app owner has added in the dashboard. */
export class NotRegisteredError extends Error {
  constructor() {
    super("This site's Spotify app hasn't added your account yet. Ask whoever runs it to add you, or connect with your own free Spotify app instead.");
  }
}

/** Spotify answers 403 "User not registered in the Developer Dashboard" for accounts missing from a dev-mode app's list. */
export function isNotRegistered(status: number, body: string) {
  return status === 403 && /not (been )?registered|developer dashboard|user may not be registered/i.test(body);
}

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Spotify is rate-limiting this app. Try again in ${Math.ceil(retryAfterSeconds / 60)} min.`);
  }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  const url = path.startsWith("http") ? path : API + path;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetchImpl(url, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("Retry-After") ?? 2);
      if (wait > 30) throw new RateLimitError(wait);
      await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
      continue;
    }
    if (res.status >= 500 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }
    const text = await res.text();
    if (isNotRegistered(res.status, text)) throw new NotRegisteredError();
    if (!res.ok) throw new Error(`Spotify ${res.status} on ${path.replace(API, "")}: ${text.slice(0, 160)}`);
    return (text ? JSON.parse(text) : {}) as T;
  }
  throw new Error("Spotify kept failing. Try again in a minute.");
}

interface Page<T> {
  items: T[];
  next: string | null;
  total: number;
}

export async function me() {
  return api<{ id: string; display_name?: string }>("GET", "/me");
}

/** All liked songs, 50 per request (no per-track calls: Spotify rate-limits those hard). */
export async function likedSongs(onProgress?: (done: number, total: number) => void): Promise<Track[]> {
  const out: Track[] = [];
  let url: string | null = "/me/tracks?limit=50";
  while (url) {
    const page: Page<{ added_at: string; track: SpotifyTrack | null }> = await api("GET", url);
    for (const i of page.items) {
      const t = i.track;
      if (!t?.id) continue;
      out.push({ id: t.id, uri: t.uri, name: t.name, artists: t.artists.map((a) => a.name), album: t.album?.name, addedAt: i.added_at });
    }
    onProgress?.(out.length, page.total);
    url = page.next;
  }
  return out;
}

interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album?: { name: string };
}

export async function myPlaylistNames(): Promise<Set<string>> {
  const names = new Set<string>();
  let url: string | null = "/me/playlists?limit=50";
  while (url) {
    const page: Page<{ name: string }> = await api("GET", url);
    page.items.forEach((p) => p && names.add(p.name.toLowerCase()));
    url = page.next;
  }
  return names;
}

export interface CreateResult {
  name: string;
  status: "created" | "skipped";
  id?: string;
  url?: string;
  count: number;
  reason?: string;
}

/**
 * Create each playlist as a NEW private playlist. Names you already have are skipped, never touched.
 * Endpoints changed in 2026 (`/me/playlists`, `/items`); the legacy paths are tried as fallbacks.
 */
export async function createPlaylists(
  plan: { name: string; uris: string[] }[],
  description: string,
  onProgress?: (r: CreateResult) => void,
): Promise<CreateResult[]> {
  const existing = await myPlaylistNames();
  const user = await me();
  const results: CreateResult[] = [];
  for (const p of plan) {
    if (existing.has(p.name.toLowerCase())) {
      const r: CreateResult = { name: p.name, status: "skipped", count: 0, reason: "You already have a playlist with this name, so it was left alone." };
      results.push(r);
      onProgress?.(r);
      continue;
    }
    const body = { name: p.name, description, public: false };
    let created: { id: string; external_urls?: { spotify?: string } };
    try {
      created = await api("POST", "/me/playlists", body);
    } catch (e) {
      if (e instanceof RateLimitError) throw e;
      created = await api("POST", `/users/${encodeURIComponent(user.id)}/playlists`, body);
    }
    existing.add(p.name.toLowerCase());
    const uris = [...new Set(p.uris)];
    for (let i = 0; i < uris.length; i += 100) {
      const chunk = { uris: uris.slice(i, i + 100) };
      try {
        await api("POST", `/playlists/${created.id}/items`, chunk);
      } catch (e) {
        if (e instanceof RateLimitError) throw e;
        await api("POST", `/playlists/${created.id}/tracks`, chunk);
      }
    }
    const r: CreateResult = { name: p.name, status: "created", id: created.id, url: created.external_urls?.spotify, count: uris.length };
    results.push(r);
    onProgress?.(r);
  }
  return results;
}
