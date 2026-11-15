"use client";
import { useState } from "react";
import { aggregate, mostSkipped, playedButNotLiked, readExportFiles, skipRate, type SkipStat } from "@/lib/skips";
import { Icon } from "./Icon";

/** Load Spotify's Extended streaming history locally; find liked songs you always skip. */
export function SkipsPanel({ likedUris, isLeftOut, onLeaveOut }: { likedUris: Set<string>; isLeftOut: (uri: string) => boolean; onLeaveOut: (uri: string) => void }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<{ skipped: SkipStat[]; missing: SkipStat[]; plays: number }>();

  async function load(files: File[]) {
    setError(undefined);
    try {
      const rows = await readExportFiles(files);
      if (!rows.length) throw new Error("No plays found. Pick the Streaming_History_Audio_*.json files from the export's folder.");
      const stats = aggregate(rows);
      setResult({ skipped: mostSkipped(stats, likedUris), missing: playedButNotLiked(stats, likedUris), plays: rows.length });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="prose">
      <h2>Find the songs you always skip</h2>
      <p>
        Spotify doesn&apos;t share skips with apps, but you can request your own data: <b>Account → Privacy settings → Download your data</b>, and tick{" "}
        <b>Extended streaming history</b>. It arrives by email, sometimes within days. The files are read here, in this tab, and never uploaded.
      </p>
      <label
        className={`drop${over ? " is-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          load([...e.dataTransfer.files]);
        }}
      >
        <Icon name="upload" size={22} />
        <span>
          Drop the <code>Streaming_History_Audio</code> JSON files here, or <u>choose files</u>
        </span>
        <input type="file" accept=".json,application/json" multiple className="sr-only" onChange={(e) => load([...(e.target.files ?? [])])} />
      </label>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <p>
            Read {result.plays.toLocaleString()} plays. {result.skipped.length ? `${result.skipped.length} liked songs get skipped at least half the time.` : "None of your liked songs get skipped much. Nice."}
          </p>
          {!!result.skipped.length && (
            <ul className="manifest">
              {result.skipped.map((s) => (
                <li key={s.uri}>
                  <span />
                  <span>
                    {s.name}
                    <div style={{ color: "var(--k5)", fontSize: "var(--step-0)" }}>{s.artist}</div>
                  </span>
                  <span className="n">
                    skipped {s.skips} of {s.plays} ({Math.round(skipRate(s) * 100)}%)
                  </span>
                  <button className="btn quiet small" onClick={() => onLeaveOut(s.uri)} disabled={isLeftOut(s.uri)}>
                    {isLeftOut(s.uri) ? "Left out" : "Leave out"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!!result.missing.length && (
            <>
              <h2>Played a lot, never liked</h2>
              <p>These aren&apos;t in your Liked Songs, so they won&apos;t be sorted. Like them in Spotify and scan again if you want them in.</p>
              <ul className="manifest">
                {result.missing.slice(0, 20).map((s) => (
                  <li key={s.uri}>
                    <span />
                    <span>
                      {s.name}
                      <div style={{ color: "var(--k5)", fontSize: "var(--step-0)" }}>{s.artist}</div>
                    </span>
                    <span className="n">{s.plays} plays</span>
                    <span />
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
