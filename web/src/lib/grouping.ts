import type { Tags } from "./audio/tagger";

export interface Track {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album?: string;
  addedAt?: string;
}

export interface TaggedTrack extends Track {
  tags?: Tags | null;
  /** Why a track has no tags: no preview, too short, failed. */
  error?: string;
}

export interface Rule {
  name: string;
  /** Exact "Genre---Style" labels, or a bare "Genre" to match the whole family. */
  styles: string[];
  /** Optional mood gates (0-1). */
  maxAggressive?: number;
  minRelaxed?: number;
}

/**
 * Default playlists. First match on the track's top style wins, so specific rules come before broad ones.
 * Tuned on a real mixed library (UK bass, rap, pop, rock, desi); edit freely.
 */
export const DEFAULT_RULES: Rule[] = [
  { name: "Bassline & 140", styles: ["Electronic---Bassline", "Electronic---Dubstep", "Electronic---Grime", "Hip Hop---Bass Music"] },
  { name: "UK Garage", styles: ["Electronic---UK Garage", "Electronic---Speed Garage", "Electronic---Garage House", "Funk / Soul---UK Street Soul"] },
  { name: "Drum & Bass", styles: ["Electronic---Drum n Bass", "Electronic---Jungle", "Electronic---Halftime", "Electronic---Breakcore"] },
  { name: "Breaks & UK Bass", styles: ["Electronic---Breakbeat", "Electronic---Breaks", "Electronic---Broken Beat", "Electronic---Big Beat", "Electronic---Progressive Breaks"] },
  {
    name: "House & Techno",
    styles: [
      "Electronic---House", "Electronic---Deep House", "Electronic---Tech House", "Electronic---Minimal", "Electronic---Minimal Techno",
      "Electronic---Techno", "Electronic---Deep Techno", "Electronic---Progressive House", "Electronic---Acid House", "Electronic---Electro House",
      "Electronic---Hard House", "Electronic---Tribal House", "Electronic---Ghetto House", "Electronic---Euro House", "Electronic---Italo House",
      "Electronic---Nu-Disco", "Electronic---Disco", "Electronic---Hip-House",
    ],
  },
  {
    name: "Chill",
    styles: [
      "Electronic---Downtempo", "Electronic---Ambient", "Electronic---Trip Hop", "Hip Hop---Trip Hop", "Electronic---Chillwave",
      "Electronic---Tropical House", "Electronic---Synth-pop", "Electronic---Future Jazz", "Electronic---Vaporwave", "Pop---Indie Pop",
      "Rock---Indie Rock", "Rock---Dream Pop", "Rock---Soft Rock", "Funk / Soul---Neo Soul", "Jazz", "Pop---Ballad", "Hip Hop---Jazzy Hip-Hop",
    ],
    maxAggressive: 0.5,
  },
  { name: "R&B & Soul", styles: ["Hip Hop---RnB/Swing", "Funk / Soul", "Blues"] },
  { name: "Trap", styles: ["Hip Hop---Trap", "Hip Hop---Crunk", "Hip Hop---Bounce", "Hip Hop---Thug Rap", "Hip Hop---Screw"] },
  { name: "Cloud & Emo Rap", styles: ["Hip Hop---Cloud Rap", "Hip Hop---Horrorcore"] },
  { name: "Grime & UK Rap", styles: ["Hip Hop---Grime", "Hip Hop---Britcore"] },
  {
    name: "Classic Hip Hop",
    styles: ["Hip Hop---Boom Bap", "Hip Hop---Conscious", "Hip Hop---Hardcore Hip-Hop", "Hip Hop---G-Funk", "Hip Hop---Gangsta", "Hip Hop---Turntablism", "Hip Hop"],
  },
  { name: "Reggae & Dancehall", styles: ["Reggae", "Hip Hop---Ragga HipHop"] },
  { name: "Rock & Alt", styles: ["Rock"] },
  { name: "Pop", styles: ["Pop", "Electronic---Dance-pop", "Electronic---Eurodance", "Electronic---Hands Up"] },
  { name: "Latin", styles: ["Latin"] },
  { name: "World & Folk", styles: ["Folk, World, & Country"] },
  { name: "Soundtracks", styles: ["Stage & Screen", "Classical"] },
  { name: "Electronic", styles: ["Electronic"] },
];

export const LEFTOVERS = "Everything else";

export interface PlannedPlaylist {
  key: string;
  name: string;
  hue: number;
  /** OKLCH lightness for the cabinet face; alternates so same-family hues still separate. */
  light: number;
  trackIds: string[];
}

export interface Plan {
  playlists: PlannedPlaylist[];
  /** Track id -> playlist key. Absent = untagged. */
  assignment: Record<string, string>;
  /** Tracks the user chose to leave out (kept visible, struck through). */
  leftOut: Record<string, true>;
}

/**
 * Cabinet colours as [OKLCH hue, lightness]. Yellows and yellow-greens (60-130) are reserved for actions.
 * Each playlist prefers its own hue (so it keeps its colour from Listen to Review); if another playlist
 * in the same stack already took that colour family, it moves to the free slot furthest from the rest.
 */
export const PALETTE: [number, number][] = [
  [25, 0.52], [150, 0.47], [205, 0.5], [270, 0.52], [325, 0.5],
  [45, 0.42], [175, 0.4], [235, 0.38], [295, 0.4], [0, 0.42], [345, 0.36], [190, 0.58],
];
const PREFERRED: Record<string, number> = {
  "Bassline & 140": 4, "UK Garage": 1, "Drum & Bass": 0, "Breaks & UK Bass": 8, "House & Techno": 2,
  Chill: 3, "R&B & Soul": 9, Trap: 7, "Cloud & Emo Rap": 10, "Grime & UK Rap": 5, "Classic Hip Hop": 6,
  "Reggae & Dancehall": 1, "Rock & Alt": 0, Pop: 4, Latin: 9, "World & Folk": 6, Soundtracks: 11, Electronic: 11,
};
const angle = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
const FAMILY = 40; // hues closer than this read as the same colour

/** Assign colours in rule order (not stack position), so a playlist's colour doesn't change when the stack re-sorts. */
export function assignColours(
  names: string[],
  rules: Rule[] = DEFAULT_RULES,
  /** Colours already shown this session; they're kept so a cabinet never changes colour. */
  fixed: Record<string, [number, number]> = {},
): Record<string, [number, number]> {
  const order = [...rules.map((r) => r.name), LEFTOVERS];
  const sorted = [...names].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const out: Record<string, [number, number]> = {};
  const taken: number[] = [];
  for (const name of sorted) {
    const f = fixed[name];
    if (!f) continue;
    out[name] = f;
    const i = PALETTE.findIndex((p) => p[0] === f[0] && p[1] === f[1]);
    if (i >= 0) taken.push(i);
  }
  for (const name of sorted) {
    if (out[name]) continue;
    if (name === LEFTOVERS) {
      out[name] = [0, 0.3];
      continue;
    }
    const free = (i: number) => taken.every((t) => angle(PALETTE[i][0], PALETTE[t][0]) >= FAMILY);
    let pick = PREFERRED[name] ?? 0;
    if (!free(pick) || taken.includes(pick)) {
      const candidates = PALETTE.map((_, i) => i).filter((i) => !taken.includes(i));
      pick =
        candidates.find(free) ??
        candidates.sort((a, b) => Math.min(...taken.map((t) => angle(PALETTE[b][0], PALETTE[t][0]))) - Math.min(...taken.map((t) => angle(PALETTE[a][0], PALETTE[t][0]))))[0] ??
        0;
    }
    taken.push(pick);
    out[name] = PALETTE[pick];
  }
  return out;
}

function matches(top: string, rule: Rule): boolean {
  return rule.styles.some((s) => top === s || top.split("---")[0] === s);
}

export function playlistFor(tags: Tags, rules: Rule[] = DEFAULT_RULES): string {
  const top = tags.styles[0]?.[0];
  if (!top) return LEFTOVERS;
  for (const r of rules) {
    if (!matches(top, r)) continue;
    if (r.maxAggressive !== undefined && (tags.moods.aggressive ?? 0) > r.maxAggressive) continue;
    if (r.minRelaxed !== undefined && (tags.moods.relaxed ?? 1) < r.minRelaxed) continue;
    return r.name;
  }
  return LEFTOVERS;
}

/**
 * Group tagged tracks into playlists. Groups smaller than `minSize` fold into "Everything else",
 * so the stack doesn't fill up with two-song cabinets.
 */
export function buildPlan(
  tracks: TaggedTrack[],
  rules: Rule[] = DEFAULT_RULES,
  minSize = 4,
  fixedColours: Record<string, [number, number]> = {},
): Plan {
  const groups = new Map<string, string[]>();
  for (const t of tracks) {
    if (!t.tags) continue;
    const name = playlistFor(t.tags, rules);
    groups.set(name, [...(groups.get(name) ?? []), t.id]);
  }
  for (const [name, ids] of [...groups]) {
    if (name !== LEFTOVERS && ids.length < minSize) {
      groups.delete(name);
      groups.set(LEFTOVERS, [...(groups.get(LEFTOVERS) ?? []), ...ids]);
    }
  }
  const order = [...rules.map((r) => r.name), LEFTOVERS];
  const colours = assignColours([...groups.keys()], rules, fixedColours);
  const playlists = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([name, trackIds]) => ({ key: name, name, trackIds, hue: colours[name][0], light: colours[name][1] }));
  const assignment: Record<string, string> = {};
  for (const p of playlists) for (const id of p.trackIds) assignment[id] = p.key;
  return { playlists, assignment, leftOut: {} };
}

export function moveTrack(plan: Plan, trackId: string, toKey: string): Plan {
  const from = plan.assignment[trackId];
  if (from === toKey) return plan;
  const playlists = plan.playlists.map((p) => {
    if (p.key === from) return { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) };
    if (p.key === toKey) return { ...p, trackIds: [...p.trackIds, trackId] };
    return p;
  });
  return { ...plan, playlists, assignment: { ...plan.assignment, [trackId]: toKey } };
}

export function toggleLeftOut(plan: Plan, trackId: string): Plan {
  const leftOut = { ...plan.leftOut };
  if (leftOut[trackId]) delete leftOut[trackId];
  else leftOut[trackId] = true;
  return { ...plan, leftOut };
}

export function renamePlaylist(plan: Plan, key: string, name: string): Plan {
  return { ...plan, playlists: plan.playlists.map((p) => (p.key === key ? { ...p, name } : p)) };
}

/** What will actually be created: non-empty playlists, minus left-out tracks. */
export function finalPlaylists(plan: Plan, tracksById: Record<string, Track>) {
  return plan.playlists
    .map((p) => ({ name: p.name.trim(), uris: p.trackIds.filter((id) => !plan.leftOut[id]).map((id) => tracksById[id]?.uri).filter(Boolean) as string[] }))
    .filter((p) => p.name && p.uris.length);
}
