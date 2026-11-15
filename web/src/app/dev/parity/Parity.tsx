"use client";
import { useState } from "react";
import type { TaggedTrack } from "@/lib/grouping";
import { Runner } from "@/lib/runner";
import { clearAll } from "@/lib/cache";

interface Row {
  name: string;
  py: string;
  js: string;
  pyScore: number;
  jsScore: number;
  overlap: number;
}

export default function Parity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("idle");
  async function go() {
    setStatus("running");
    await clearAll();
    const lib: { tracks: TaggedTrack[] } = await (await fetch("/demo/library.json")).json();
    const sample = lib.tracks.filter((t) => t.tags).slice(0, 12);
    const byId = Object.fromEntries(sample.map((t) => [t.id, t]));
    const out: Row[] = [];
    await new Promise<void>((resolve) => {
      new Runner((ev) => {
        if (ev.type === "track") {
          const py = byId[ev.track.id].tags!.styles;
          const js = ev.track.tags?.styles ?? [];
          const pySet = new Set(py.slice(0, 3).map((s) => s[0]));
          out.push({
            name: ev.track.name,
            py: py[0][0],
            js: js[0]?.[0] ?? `ERR ${ev.track.error}`,
            pyScore: py[0][1],
            jsScore: js[0]?.[1] ?? 0,
            overlap: js.slice(0, 3).filter((s) => pySet.has(s[0])).length,
          });
          setRows([...out]);
        }
        if (ev.type === "done" || ev.type === "error") {
          if (ev.type === "error") setStatus(ev.message);
          resolve();
        }
      }).run(sample.map((t) => ({ id: t.id, uri: t.uri, name: t.name, artists: t.artists })));
    });
    setStatus("done");
  }
  const agree = rows.filter((r) => r.py === r.js).length;
  return (
    <main style={{ padding: 24 }}>
      <button className="btn primary" onClick={go} id="run">
        Run parity
      </button>
      <p id="status">
        {status} {rows.length ? `top-1 agree ${agree}/${rows.length}` : ""}
      </p>
      <pre id="rows">{rows.map((r) => `${r.py === r.js ? "OK " : "-- "} ${r.name} | py ${r.py} ${r.pyScore} | js ${r.js} ${r.jsScore} | top3 overlap ${r.overlap}`).join("\n")}</pre>
    </main>
  );
}
