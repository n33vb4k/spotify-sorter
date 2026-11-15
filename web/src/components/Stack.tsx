"use client";
import type { Plan } from "@/lib/grouping";
import { LEFTOVERS } from "@/lib/grouping";

/** Pixels per song. Exact proportion: a cabinet's face is count x unit, never rounded for looks. */
export function unitFor(total: number) {
  return Math.min(8, Math.max(2, 560 / Math.max(total, 1)));
}

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
}: {
  plan: Plan;
  total: number;
  selected?: string;
  onSelect: (key: string) => void;
  leftOutCount: (key: string) => number;
  caption?: string;
}) {
  const unit = unitFor(total);
  if (!plan.playlists.length)
    return (
      <div className="stack-empty">
        <p>The stack builds here as songs are tagged. Each cabinet is a playlist; its height is its song count.</p>
      </div>
    );
  return (
    <div className="stack-wrap">
      <ul className="stack" aria-label="Proposed playlists">
        {plan.playlists.map((p) => {
          const count = p.trackIds.length - leftOutCount(p.key);
          const px = Math.max(count, 0) * unit;
          return (
            <li key={p.key}>
              <button
                type="button"
                className={`cab${p.key === LEFTOVERS ? " is-leftovers" : ""}`}
                style={{ height: px, ["--h" as string]: p.hue, ["--px" as string]: `${px}px` }}
                aria-pressed={selected === p.key}
                aria-label={`${p.name}, ${count} songs`}
                onClick={() => onSelect(p.key)}
              >
                <span className="cab-name">{p.name}</span>
                <span className="cab-count">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="stack-legend">
        {caption ?? `${plan.playlists.length} playlists. Every song adds ${unit.toFixed(unit < 3 ? 1 : 0)}px of height.`}
      </p>
    </div>
  );
}
