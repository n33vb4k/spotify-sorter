/**
 * Parse Spotify's "Extended streaming history" export (Streaming_History_Audio_*.json) locally.
 * Nothing is uploaded: the files are read in the browser with the File API.
 */

export interface PlayRow {
  ts?: string;
  ms_played?: number;
  spotify_track_uri?: string | null;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  skipped?: boolean | null;
  reason_end?: string | null;
}

export interface SkipStat {
  uri: string;
  name: string;
  artist: string;
  plays: number;
  skips: number;
  /** Plays that ended in under 30 s, whatever the reason. */
  quickExits: number;
  msPlayed: number;
  lastPlayed?: string;
}

const isSkip = (r: PlayRow) => r.skipped === true || r.reason_end === "fwdbtn";

export function aggregate(rows: PlayRow[]): Map<string, SkipStat> {
  const stats = new Map<string, SkipStat>();
  for (const r of rows) {
    const uri = r.spotify_track_uri;
    if (!uri || !uri.startsWith("spotify:track:")) continue; // podcasts, audiobooks, local files
    const s = stats.get(uri) ?? {
      uri,
      name: r.master_metadata_track_name ?? "Unknown",
      artist: r.master_metadata_album_artist_name ?? "Unknown",
      plays: 0,
      skips: 0,
      quickExits: 0,
      msPlayed: 0,
    };
    s.plays += 1;
    s.msPlayed += r.ms_played ?? 0;
    if (isSkip(r)) s.skips += 1;
    if ((r.ms_played ?? 0) < 30_000) s.quickExits += 1;
    if (r.ts && (!s.lastPlayed || r.ts > s.lastPlayed)) s.lastPlayed = r.ts;
    stats.set(uri, s);
  }
  return stats;
}

export const skipRate = (s: SkipStat) => (s.plays ? s.skips / s.plays : 0);

/** Liked songs you skip most often (at least `minPlays` plays). */
export function mostSkipped(stats: Map<string, SkipStat>, likedUris: Set<string>, minPlays = 4, limit = 50): SkipStat[] {
  return [...stats.values()]
    .filter((s) => likedUris.has(s.uri) && s.plays >= minPlays && skipRate(s) >= 0.5)
    .sort((a, b) => skipRate(b) - skipRate(a) || b.plays - a.plays)
    .slice(0, limit);
}

/** Songs you play a lot but haven't liked. */
export function playedButNotLiked(stats: Map<string, SkipStat>, likedUris: Set<string>, minPlays = 8, limit = 50): SkipStat[] {
  return [...stats.values()]
    .filter((s) => !likedUris.has(s.uri) && s.plays >= minPlays && skipRate(s) < 0.3)
    .sort((a, b) => b.msPlayed - a.msPlayed)
    .slice(0, limit);
}

export async function readExportFiles(files: File[]): Promise<PlayRow[]> {
  const rows: PlayRow[] = [];
  for (const f of files) {
    if (!f.name.endsWith(".json")) continue;
    const data = JSON.parse(await f.text());
    if (Array.isArray(data)) rows.push(...data);
  }
  return rows;
}
