/**
 * Orchestrates tagging: find preview (proxy) -> fetch MP3 -> decode to 16 kHz -> model worker.
 * Fetch/decode runs a few tracks ahead of the (single) model worker. Results are cached in IndexedDB.
 */
import type { Tags } from "./audio/tagger";
import type { TaggedTrack, Track } from "./grouping";
import * as cache from "./cache";

export interface Cached {
  tags?: Tags | null;
  error?: string;
  preview?: string | null;
}

export type RunEvent =
  | { type: "loading-models" }
  | { type: "ready" }
  | { type: "track"; track: TaggedTrack; done: number; total: number }
  | { type: "done" }
  | { type: "error"; message: string };

const MODEL_BASE = process.env.NEXT_PUBLIC_MODEL_BASE || "/models";

export async function findPreview(t: Track, attempts = 4): Promise<string | null> {
  const q = new URLSearchParams({ artists: t.artists.join("|"), title: t.name });
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`/api/preview?${q}`);
    if (res.status === 429 || res.status === 502) {
      // Back off and retry rather than marking the song as failed.
      const wait = Number(res.headers.get("Retry-After")) || 2 ** i;
      await new Promise((r) => setTimeout(r, Math.min(wait, 30) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`preview lookup failed (${res.status})`);
    return (await res.json()).preview ?? null;
  }
  throw new Error("preview lookup kept failing");
}

export class Runner {
  private worker: Worker | null = null;
  private pending = new Map<string, (r: { tags?: Tags | null; error?: string }) => void>();
  private stopped = false;

  constructor(private onEvent: (e: RunEvent) => void) {}

  private async boot() {
    if (this.worker) return;
    this.onEvent({ type: "loading-models" });
    this.worker = new Worker(new URL("./audio/tag.worker.ts", import.meta.url), { type: "module" });
    await new Promise<void>((resolve, reject) => {
      this.worker!.onmessage = (e) => {
        const m = e.data;
        if (m.type === "ready") resolve();
        else if (m.type === "error" && !m.id) reject(new Error(m.message));
        else if (m.id) {
          this.pending.get(m.id)?.(m.type === "tags" ? { tags: m.tags } : { error: m.message });
          this.pending.delete(m.id);
        }
      };
      this.worker!.postMessage({ type: "init", base: new URL(MODEL_BASE, window.location.origin).href.replace(/\/$/, "") });
    });
    this.onEvent({ type: "ready" });
  }

  private infer(id: string, signal: Float32Array) {
    return new Promise<{ tags?: Tags | null; error?: string }>((resolve) => {
      this.pending.set(id, resolve);
      this.worker!.postMessage({ type: "tag", id, signal }, [signal.buffer]);
    });
  }

  stop() {
    this.stopped = true;
  }

  async run(tracks: Track[], lookahead = 3) {
    this.stopped = false;
    const cached = await cache.getAll<Cached>().catch(() => ({}) as Record<string, Cached>);
    let done = 0;
    const total = tracks.length;
    const todo: Track[] = [];
    for (const t of tracks) {
      const c = cached[t.id];
      if (c && (c.tags || c.error === "no preview")) {
        done++;
        this.onEvent({ type: "track", track: { ...t, tags: c.tags, error: c.error }, done, total });
      } else todo.push(t);
    }
    if (!todo.length) return this.onEvent({ type: "done" });
    try {
      await this.boot();
    } catch (e) {
      return this.onEvent({ type: "error", message: `Couldn't load the listening models: ${(e as Error).message}` });
    }
    const { decodeTo16kMono } = await import("./audio/decode");

    // Prepare (lookup + download + decode) a few tracks ahead of inference.
    const prepare = async (t: Track): Promise<{ signal?: Float32Array; error?: string }> => {
      try {
        const url = await findPreview(t);
        if (!url) return { error: "no preview" };
        const bytes = await (await fetch(url)).arrayBuffer();
        return { signal: await decodeTo16kMono(bytes) };
      } catch (e) {
        return { error: (e as Error).message };
      }
    };
    const queue = todo.map((t) => ({ t, p: null as Promise<{ signal?: Float32Array; error?: string }> | null }));
    for (let i = 0; i < queue.length && !this.stopped; i++) {
      for (let j = i; j < Math.min(queue.length, i + lookahead); j++) queue[j].p ??= prepare(queue[j].t);
      const { t } = queue[i];
      const prep = await queue[i].p!;
      let result: { tags?: Tags | null; error?: string } = { error: prep.error };
      if (prep.signal) result = await this.infer(t.id, prep.signal);
      if (result.tags === null) result = { error: "preview too short" };
      done++;
      await cache.put<Cached>(t.id, result).catch(() => {});
      this.onEvent({ type: "track", track: { ...t, ...result }, done, total });
    }
    this.onEvent({ type: "done" });
  }
}
