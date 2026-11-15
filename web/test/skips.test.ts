import { describe, expect, it } from "vitest";
import { aggregate, mostSkipped, playedButNotLiked } from "../src/lib/skips";

const row = (uri: string, ms: number, skipped = false) => ({ spotify_track_uri: uri, ms_played: ms, skipped, master_metadata_track_name: uri, master_metadata_album_artist_name: "x" });

describe("skip analysis", () => {
  const rows = [
    ...Array.from({ length: 5 }, () => row("spotify:track:a", 5_000, true)),
    ...Array.from({ length: 10 }, () => row("spotify:track:b", 200_000)),
    row("spotify:episode:pod", 1_000_000),
  ];
  const stats = aggregate(rows);
  it("ignores non-track rows", () => expect(stats.has("spotify:episode:pod")).toBe(false));
  it("finds liked songs you skip", () => expect(mostSkipped(stats, new Set(["spotify:track:a"]))[0].uri).toBe("spotify:track:a"));
  it("finds songs you play but haven't liked", () => expect(playedButNotLiked(stats, new Set())[0].uri).toBe("spotify:track:b"));
});

import { isNotRegistered } from "../src/lib/spotify";
describe("Spotify allowlist detection", () => {
  it("recognises Spotify's not-registered 403", () => {
    expect(isNotRegistered(403, '{"error":{"status":403,"message":"User not registered in the Developer Dashboard"}}')).toBe(true);
    expect(isNotRegistered(403, "Check settings on developer.spotify.com/dashboard, the user may not be registered.")).toBe(true);
  });
  it("leaves other errors alone", () => {
    expect(isNotRegistered(403, '{"error":{"status":403,"message":"Insufficient client scope"}}')).toBe(false);
    expect(isNotRegistered(401, "User not registered")).toBe(false);
  });
});
