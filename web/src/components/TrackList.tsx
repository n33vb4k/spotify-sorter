"use client";
import { useState } from "react";
import type { Plan, TaggedTrack } from "@/lib/grouping";
import { styleBlurb, styleName } from "@/lib/styles";
import { Icon } from "./Icon";

function topStyle(tracks: TaggedTrack[]) {
  const counts = new Map<string, number>();
  for (const t of tracks) {
    const s = t.tags?.styles[0]?.[0];
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function TrackList({
  plan,
  playlistKey,
  tracksById,
  focusId,
  playingId,
  onPlay,
  onMove,
  onToggleOut,
  onRename,
  readOnly,
}: {
  plan: Plan;
  playlistKey: string;
  tracksById: Record<string, TaggedTrack>;
  focusId?: string;
  playingId?: string;
  onPlay: (t: TaggedTrack) => void;
  onMove: (id: string, to: string) => void;
  onToggleOut: (id: string) => void;
  onRename: (name: string) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<{ id: string; style: string }>();
  const p = plan.playlists.find((x) => x.key === playlistKey);
  if (!p) return null;
  const tracks = p.trackIds.map((id) => tracksById[id]).filter(Boolean);
  const out = tracks.filter((t) => plan.leftOut[t.id]).length;
  const dominant = topStyle(tracks);
  const blurb = dominant && styleBlurb(dominant);

  return (
    <section style={{ ["--h" as string]: p.hue, ["--l" as string]: p.light }} aria-labelledby="list-title">
      <div className="list-head">
        {readOnly ? (
          <h2 id="list-title" className="stencil">
            {p.name}
          </h2>
        ) : (
          <>
            <label htmlFor="list-title" className="sr-only">
              Playlist name
            </label>
            <input id="list-title" className="rename" value={p.name} onChange={(e) => onRename(e.target.value)} maxLength={100} />
          </>
        )}
      </div>
      <p className="list-sub">
        {tracks.length - out} songs{out ? `, ${out} left out` : ""}
        {!readOnly && ". Rename it, move songs, or leave them out."}
      </p>
      {blurb && (
        <p className="blurb">
          <b>{styleName(dominant!)}:</b> {blurb}
        </p>
      )}
      <ol className="tracks">
        {tracks.map((t) => {
          const isOut = !!plan.leftOut[t.id];
          const styles = t.tags?.styles ?? [];
          return (
            <li key={t.id} className={`trow${isOut ? " is-out" : ""}${focusId === t.id ? " is-focus" : ""}`}>
              <button type="button" className="play" onClick={() => onPlay(t)} aria-label={`${playingId === t.id ? "Pause" : "Play preview of"} ${t.name}`}>
                <Icon name={playingId === t.id ? "pause" : "play"} size={16} />
              </button>
              <div style={{ minWidth: 0 }}>
                <div className="title">{t.name}</div>
                <div className="artist">{t.artists.join(", ")}</div>
              </div>
              <div className="actions">
                {isOut && <span className="out-mark">Left out</span>}
                {!readOnly && (
                  <>
                    <label className="sr-only" htmlFor={`mv-${t.id}`}>
                      Move {t.name} to
                    </label>
                    <select id={`mv-${t.id}`} className="select" value={p.key} onChange={(e) => onMove(t.id, e.target.value)} disabled={isOut}>
                      {plan.playlists.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.key === p.key ? "Move to…" : o.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn quiet small" onClick={() => onToggleOut(t.id)} aria-pressed={isOut}>
                      <Icon name={isOut ? "undo" : "out"} size={14} />
                      {isOut ? "Put back" : "Leave out"}
                    </button>
                  </>
                )}
              </div>
              <div className="tags">
                <span className="swatch" aria-hidden />
                {styles.filter(([, v], i) => i === 0 || v >= 0.1).slice(0, 3).map(([s, v], i) => {
                  const isOpen = open?.id === t.id && open.style === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      className={`chip${i === 0 ? " top" : ""}`}
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? undefined : { id: t.id, style: s })}
                    >
                      {styleName(s)} <span className="pct">{Math.round(v * 100)}%</span>
                    </button>
                  );
                })}
                {t.tags?.moods.relaxed !== undefined && (
                  <span className="mood" title="How relaxed it sounds">
                    chill <i style={{ ["--v" as string]: `${Math.round((t.tags.moods.relaxed ?? 0) * 100)}%` }} />
                  </span>
                )}
                {t.tags?.moods.aggressive !== undefined && (
                  <span className="mood" title="How aggressive it sounds">
                    hard <i style={{ ["--v" as string]: `${Math.round((t.tags.moods.aggressive ?? 0) * 100)}%` }} />
                  </span>
                )}
              </div>
              {open?.id === t.id && (
                <p className="chip-blurb">
                  <b>{styleName(open.style)}:</b> {styleBlurb(open.style) ?? "A Discogs style the model recognised. No plain-English note for this one yet."}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
