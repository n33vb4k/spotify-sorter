"use client";
import type { Plan } from "@/lib/grouping";
import { LEFTOVERS } from "@/lib/grouping";

/** Pixels per song. Exact proportion: a cabinet's face is count x unit, never rounded for looks. */
export function unitFor(total: number, compact = false) {
  const u = Math.min(8, Math.max(2, 560 / Math.max(total, 1)));
  return compact ? u / 2 : u;
}
const LABEL_MIN = 22;

/** Smallest group that still fits a readable stencil label at this unit. */
export function minGroupFor(total: number) {
  return Math.max(3, Math.ceil(22 / unitFor(total)));
}

export function Stack({
  plan,
  total,
  selected,
  onSelect,
  leftOutCount,
  caption,
  compact,
  ghost,
}: {
  plan: Plan;
  total: number;
  selected?: string;
  onSelect: (key: string) => void;
  leftOutCount: (key: string) => number;
  caption?: string;
  compact?: boolean;
  /** Draw the full-library height as a dashed outline, so the stack visibly fills towards it. */
  ghost?: boolean;
}) {
  const unit = unitFor(total, compact);
  if (!plan.playlists.length)
    return (
      <div className="stack-empty">
        <p>The stack builds here as songs are tagged. Each cabinet is a playlist; its height is its song count.</p>
      </div>
    );
  return (
    <div className="stack-wrap">
      <ul className={`stack${ghost ? " has-ghost" : ""}`} aria-label="Proposed playlists" style={ghost ? { minHeight: total * unit } : undefined}>
        {plan.playlists.map((p) => {
          const count = p.trackIds.length - leftOutCount(p.key);
          const px = Math.max(count, 0) * unit;
          const short = px < LABEL_MIN;
          return (
            <li key={p.key} className={short ? "cab-row is-short" : "cab-row"} style={{ ["--h" as string]: p.hue, ["--l" as string]: p.light }}>
              <button
                type="button"
                className={`cab${p.key === LEFTOVERS ? " is-leftovers" : ""}`}
                style={{ height: px, ["--px" as string]: `${px}px` }}
                aria-pressed={selected === p.key}
                aria-label={`${p.name}, ${count} songs`}
                onClick={() => onSelect(p.key)}
              >
                {!short && (
                  <>
                    <span className="cab-name">{p.name}</span>
                    <span className="cab-count">{count}</span>
                  </>
                )}
              </button>
              {short && (
                <span className="cab-aside" aria-hidden>
                  {p.name} {count}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="stack-legend">
        {caption ?? `${plan.playlists.length} playlists. Taller cabinet, more songs: each song is one step of height.`}
      </p>
    </div>
  );
}
