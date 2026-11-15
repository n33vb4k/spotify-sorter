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
 * Cabinet colours by stack position: [OKLCH hue, lightness]. Neighbours sit far apart on the wheel and
 * alternate lightness; yellows and yellow-greens (60-130) are reserved for actions.
 */
export const HUES: [number, number][] = [
  [25, 0.52], [205, 0.5], [325, 0.5], [150, 0.47], [270, 0.52],
  [45, 0.44], [0, 0.42], [235, 0.4], [295, 0.4], [165, 0.36],
];

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
export function buildPlan(tracks: TaggedTrack[], rules: Rule[] = DEFAULT_RULES, minSize = 4): Plan {
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
  const playlists = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || order.indexOf(a[0]) - order.indexOf(b[0]))
    // Hue by stack position, so neighbouring cabinets never share a colour.
    .map(([name, trackIds], i) => ({ key: name, name, trackIds, hue: HUES[i % HUES.length][0], light: HUES[i % HUES.length][1] }));
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
