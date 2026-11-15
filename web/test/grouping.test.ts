import { describe, expect, it } from "vitest";
import { buildPlan, finalPlaylists, LEFTOVERS, moveTrack, playlistFor, toggleLeftOut, type TaggedTrack } from "../src/lib/grouping";

const tr = (id: string, style: string, moods = {}): TaggedTrack => ({
  id, uri: `spotify:track:${id}`, name: id, artists: ["a"], tags: { styles: [[style, 0.9]], moods },
});

describe("playlistFor", () => {
  it("matches exact styles before broad families", () => {
    expect(playlistFor(tr("x", "Electronic---Bassline").tags!)).toBe("Bassline & 140");
    expect(playlistFor(tr("x", "Electronic---Synthwave").tags!)).toBe("Electronic");
    expect(playlistFor(tr("x", "Hip Hop---Trap").tags!)).toBe("Trap");
  });
  it("applies mood gates", () => {
    expect(playlistFor(tr("x", "Rock---Indie Rock", { aggressive: 0.1 }).tags!)).toBe("Chill");
    expect(playlistFor(tr("x", "Rock---Indie Rock", { aggressive: 0.9 }).tags!)).toBe("Rock & Alt");
  });
  it("falls back to leftovers", () => expect(playlistFor({ styles: [], moods: {} })).toBe(LEFTOVERS));
});

describe("buildPlan", () => {
  const tracks = [
    ...Array.from({ length: 5 }, (_, i) => tr(`b${i}`, "Electronic---Bassline")),
    ...Array.from({ length: 2 }, (_, i) => tr(`t${i}`, "Hip Hop---Trap")),
    { id: "u", uri: "spotify:track:u", name: "u", artists: ["a"], error: "no preview" },
  ];
  const plan = buildPlan(tracks, undefined, 4);
  it("folds small groups into leftovers and skips untagged", () => {
    expect(plan.playlists.map((p) => [p.name, p.trackIds.length])).toEqual([["Bassline & 140", 5], [LEFTOVERS, 2]]);
    expect(plan.assignment.u).toBeUndefined();
  });
  it("moves and leaves out without losing tracks", () => {
    let p = moveTrack(plan, "b0", LEFTOVERS);
    p = toggleLeftOut(p, "b1");
    const byId = Object.fromEntries(tracks.map((t) => [t.id, t]));
    const final = finalPlaylists(p, byId);
    expect(final[0].uris).toHaveLength(3);
    expect(final[1].uris).toContain("spotify:track:b0");
    expect(p.playlists.flatMap((x) => x.trackIds)).toContain("b1"); // left out, still visible
  });
});
