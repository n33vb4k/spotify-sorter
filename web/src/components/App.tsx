"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPlan, DEFAULT_RULES, finalPlaylists, type Plan, type TaggedTrack } from "@/lib/grouping";
import { Runner } from "@/lib/runner";
import * as spotify from "@/lib/spotify";
import { Icon } from "./Icon";
import { ConnectPanel, CreatePanel, ListenPanel, Promise_, ScanPanel } from "./Panels";
import { Player } from "./Player";
import { SkipsPanel } from "./SkipsPanel";
import { minGroupFor, Stack } from "./Stack";
import { TrackList } from "./TrackList";

type Step = "connect" | "scan" | "listen" | "review" | "create" | "skips";
const STEPS: { id: Exclude<Step, "skips">; label: string }[] = [
  { id: "connect", label: "Connect" },
  { id: "scan", label: "Scan" },
  { id: "listen", label: "Listen" },
  { id: "review", label: "Review" },
  { id: "create", label: "Create" },
];

interface Edits {
  moves: Record<string, string>;
  leftOut: Record<string, true>;
  names: Record<string, string>;
}
const NO_EDITS: Edits = { moves: {}, leftOut: {}, names: {} };

/** Apply the user's edits on top of the computed plan, so new tags never wipe them. */
function applyEdits(base: Plan, edits: Edits, order: string[]): Plan {
  const keys = new Set(base.playlists.map((p) => p.key));
  const assignment = { ...base.assignment };
  for (const [id, to] of Object.entries(edits.moves)) if (assignment[id] && keys.has(to)) assignment[id] = to;
  const playlists = base.playlists.map((p) => ({
    ...p,
    name: edits.names[p.key] ?? p.name,
    trackIds: Object.keys(assignment).filter((id) => assignment[id] === p.key),
  }));
  const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length);
  playlists.sort((a, b) => rank(a.key) - rank(b.key));
  return { playlists, assignment, leftOut: edits.leftOut };
}

export default function App() {
  const [step, setStep] = useState<Step>("connect");
  const [demo, setDemo] = useState(false);
  const [connected, setConnected] = useState(false);
  const [clientId, setClientIdState] = useState("");
  const [redirect, setRedirect] = useState("");
  const [connectError, setConnectError] = useState<string>();

  const [library, setLibrary] = useState<TaggedTrack[]>([]);
  const [scan, setScan] = useState({ done: 0, total: 0, error: undefined as string | undefined });
  const [tagged, setTagged] = useState<Record<string, TaggedTrack>>({});
  const [recent, setRecent] = useState<TaggedTrack[]>([]);
  const [listen, setListen] = useState<{ done: number; status: "loading" | "running" | "done" | "stopped" | "error"; error?: string }>({ done: 0, status: "loading" });
  const [order, setOrder] = useState<string[]>([]);
  const [edits, setEdits] = useState<Edits>(NO_EDITS);
  const [selected, setSelected] = useState<string>();
  const [focus, setFocus] = useState<TaggedTrack>();
  const [playing, setPlaying] = useState(false);
  const [create, setCreate] = useState<{ busy: boolean; results: spotify.CreateResult[]; error?: string }>({ busy: false, results: [] });
  const [sample, setSample] = useState<TaggedTrack[]>([]);
  const runner = useRef<Runner | null>(null);
  const demoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setClientIdState(spotify.getClientId());
    setRedirect(spotify.redirectUri());
    setConnected(spotify.isLoggedIn());
    fetch("/demo/library.json")
      .then((r) => r.json())
      .then((d: { tracks: TaggedTrack[] }) => setSample(d.tracks))
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setConnectError(params.get("error")!);
    if (params.get("step") === "scan" && spotify.isLoggedIn()) {
      window.history.replaceState(null, "", "/");
      startScan();
    }
    return () => {
      runner.current?.stop();
      if (demoTimer.current) clearInterval(demoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = library.length;
  const taggedList = useMemo(() => Object.values(tagged), [tagged]);
  const base = useMemo(() => buildPlan(taggedList.filter((t) => t.tags), DEFAULT_RULES, minGroupFor(total)), [taggedList, total]);
  const plan = useMemo(() => applyEdits(base, edits, order), [base, edits, order]);
  const tracksById = useMemo(() => Object.fromEntries(library.map((t) => [t.id, tagged[t.id] ?? t])), [library, tagged]);
  const untagged = taggedList.filter((t) => !t.tags).length;

  // Re-sort the stack only between batches, so cabinets don't jump while you watch.
  useEffect(() => {
    const doneNow = listen.done;
    if (doneNow === 0) return;
    if (doneNow % 25 === 0 || listen.status !== "running" || order.length === 0) {
      setOrder(base.playlists.map((p) => p.key));
    } else {
      const missing = base.playlists.map((p) => p.key).filter((k) => !order.includes(k));
      if (missing.length) setOrder([...order, ...missing]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen.done, listen.status, base]);

  const selectedKey = selected && plan.playlists.some((p) => p.key === selected) ? selected : plan.playlists[0]?.key;

  function onTagged(t: TaggedTrack, done: number) {
    setTagged((prev) => ({ ...prev, [t.id]: t }));
    setRecent((prev) => [t, ...prev].slice(0, 8));
    setListen((s) => ({ ...s, done, status: "running" }));
  }

  async function startScan() {
    setDemo(false);
    setStep("scan");
    setScan({ done: 0, total: 0, error: undefined });
    try {
      const songs = await spotify.likedSongs((done, total) => setScan({ done, total, error: undefined }));
      setLibrary(songs);
      startListen(songs);
    } catch (e) {
      setScan((s) => ({ ...s, error: (e as Error).message }));
    }
  }

  function startListen(songs: TaggedTrack[]) {
    setStep("listen");
    setTagged({});
    setRecent([]);
    setOrder([]);
    setListen({ done: 0, status: "loading" });
    runner.current?.stop();
    const r = new Runner((ev) => {
      if (ev.type === "ready") setListen((s) => ({ ...s, status: "running" }));
      if (ev.type === "track") onTagged(ev.track, ev.done);
      if (ev.type === "done") setListen((s) => (s.status === "stopped" ? s : { ...s, status: "done" }));
      if (ev.type === "error") setListen((s) => ({ ...s, status: "error", error: ev.message }));
    });
    runner.current = r;
    r.run(songs);
  }

  async function startDemo() {
    setDemo(true);
    setEdits(NO_EDITS);
    setCreate({ busy: false, results: [] });
    const res = await fetch("/demo/library.json");
    const lib: { tracks: TaggedTrack[] } = await res.json();
    setLibrary(lib.tracks);
    setStep("listen");
    setTagged({});
    setRecent([]);
    setOrder([]);
    setListen({ done: 0, status: "running" });
    // Replay the pre-computed tags at a watchable pace so the stack fills like a real run.
    let i = 0;
    if (demoTimer.current) clearInterval(demoTimer.current);
    demoTimer.current = setInterval(() => {
      if (i >= lib.tracks.length) {
        clearInterval(demoTimer.current!);
        setListen((s) => ({ ...s, status: "done" }));
        return;
      }
      const t = lib.tracks[i++];
      onTagged(t, i);
    }, 90);
  }

  function stopListen() {
    runner.current?.stop();
    if (demoTimer.current) clearInterval(demoTimer.current);
    setListen((s) => ({ ...s, status: "stopped" }));
  }

  const playTrack = useCallback(
    (t: TaggedTrack) => {
      if (focus?.id === t.id) setPlaying((p) => !p);
      else {
        setFocus(t);
        setPlaying(true);
      }
    },
    [focus],
  );

  const final = useMemo(() => {
    const out = finalPlaylists(plan, tracksById);
    return out.map((p) => ({ ...p, hue: plan.playlists.find((x) => x.name.trim() === p.name)?.hue ?? 0 }));
  }, [plan, tracksById]);

  async function doCreate() {
    setCreate({ busy: true, results: [] });
    try {
      await spotify.createPlaylists(final, "Sorted by how it sounds, with spotify-sorter.", (r) => setCreate((c) => ({ ...c, results: [...c.results, r] })));
      setCreate((c) => ({ ...c, busy: false }));
    } catch (e) {
      setCreate((c) => ({ ...c, busy: false, error: (e as Error).message }));
    }
  }

  const reached: Record<string, boolean> = {
    connect: true,
    scan: connected || demo,
    listen: library.length > 0,
    review: plan.playlists.length > 0,
    create: plan.playlists.length > 0,
  };
  const doneSteps: Record<string, boolean> = {
    connect: connected || demo,
    scan: library.length > 0,
    listen: listen.status === "done",
    review: create.results.length > 0,
    create: create.results.length > 0 && !create.busy,
  };

  const heads: Record<Step, [string, string]> = {
    connect: [
      connected ? "You're connected" : "Sort your Liked Songs by how they sound",
      connected ? "Scan your Liked Songs to start." : "Try it on a sample library, or connect your own Spotify.",
    ],
    scan: ["Scanning your Liked Songs", "Reading 50 songs per request. Nothing is changed."],
    listen: ["Listening", demo ? "Replaying the sample library's tags." : "Each preview is analysed in this tab. Tags are saved here, so you can stop and resume."],
    review: ["Review the stack", "Pick a cabinet to see its songs. Fix anything that sounds wrong."],
    create: ["Create playlists", "Nothing has been created yet."],
    skips: ["Skips", "Optional: use your Spotify data export to leave out songs you always skip."],
  };

  const stage = (() => {
    if (step === "connect" && connected && !demo)
      return (
        <div className="prose">
          <h2>Ready to sort your Liked Songs</h2>
          <Promise_ />
          <div className="row">
            <button className="btn primary" onClick={startScan}>
              Scan my Liked Songs
            </button>
            <button
              className="btn quiet"
              onClick={() => {
                spotify.logout();
                setConnected(false);
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      );
    if (step === "connect")
      return <ConnectPanel initialId={clientId} redirect={redirect} error={connectError} onConnect={(id) => spotify.beginLogin(id)} onDemo={startDemo} />;
    if (step === "scan") return <ScanPanel done={scan.done} total={scan.total} error={scan.error} onRetry={startScan} />;
    if (step === "listen")
      return (
        <>
          {listen.error && (
            <p className="notice" role="alert" style={{ marginBottom: 16 }}>
              {listen.error}
            </p>
          )}
          <ListenPanel
            done={listen.done}
            total={total}
            status={listen.status}
            recent={recent}
            plan={plan}
            untagged={untagged}
            onStop={stopListen}
            onReview={() => setStep("review")}
          />
        </>
      );
    if (step === "review" && selectedKey)
      return (
        <TrackList
          plan={plan}
          playlistKey={selectedKey}
          tracksById={tracksById}
          focusId={focus?.id}
          playingId={playing ? focus?.id : undefined}
          onPlay={playTrack}
          onMove={(id, to) => setEdits((e) => ({ ...e, moves: { ...e.moves, [id]: to } }))}
          onToggleOut={(id) =>
            setEdits((e) => {
              const leftOut = { ...e.leftOut };
              if (leftOut[id]) delete leftOut[id];
              else leftOut[id] = true;
              return { ...e, leftOut };
            })
          }
          onRename={(name) => setEdits((e) => ({ ...e, names: { ...e.names, [selectedKey]: name } }))}
        />
      );
    if (step === "create") return <CreatePanel final={final} demo={demo} results={create.results} busy={create.busy} error={create.error} onCreate={doCreate} />;
    if (step === "skips")
      return (
        <SkipsPanel
          likedUris={new Set(library.map((t) => t.uri))}
          isLeftOut={(uri) => !!edits.leftOut[library.find((t) => t.uri === uri)?.id ?? ""]}
          onLeaveOut={(uri) => {
            const id = library.find((t) => t.uri === uri)?.id;
            if (id) setEdits((e) => ({ ...e, leftOut: { ...e.leftOut, [id]: true } }));
          }}
        />
      );
    return null;
  })();

  const showSample = step === "connect" && !connected && !demo && sample.length > 0;
  const samplePlan = useMemo(() => buildPlan(sample, DEFAULT_RULES, minGroupFor(sample.length)), [sample]);
  const showStack = step === "listen" || step === "review" || step === "create" || showSample;
  const leftOutIn = (key: string) => plan.playlists.find((p) => p.key === key)?.trackIds.filter((id) => edits.leftOut[id]).length ?? 0;

  return (
    <div className="shell">
      <nav className="rail" aria-label="Steps">
        <div className="brand">
          <Icon name="speaker" size={22} label="spotify-sorter" />
          <span className="brand-text" aria-hidden>
            spotify-sorter
          </span>
        </div>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`step${doneSteps[s.id] && step !== s.id ? " is-done" : ""}`}
                aria-current={step === s.id ? "step" : undefined}
                disabled={!reached[s.id]}
                onClick={() => setStep(s.id)}
              >
                <span className="dot">{doneSteps[s.id] && step !== s.id ? <Icon name="check" size={12} /> : i + 1}</span>
                <span className="label">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <ol className="steps" aria-label="Extras">
          <li>
            <button type="button" className="step" aria-current={step === "skips" ? "step" : undefined} disabled={!library.length} onClick={() => setStep("skips")}>
              <span className="dot">
                <Icon name="upload" size={11} />
              </span>
              <span className="label">Skips</span>
            </button>
          </li>
        </ol>
        <div className="rail-foot">
          <p>Not affiliated with Spotify. Style models by MTG-UPF (Essentia), CC BY-NC-ND 4.0.</p>
          <a href="https://github.com/n33vb4k/spotify-sorter" target="_blank" rel="noreferrer">
            Source on GitHub
          </a>
        </div>
      </nav>

      <main className="stage">
        {demo && (
          <div className="demo-banner" role="status">
            <b>Sample library.</b> 60 well-known songs, tagged by the same models. Nothing here touches a real account.
            <button className="btn quiet small" onClick={() => { stopListen(); setDemo(false); setLibrary([]); setTagged({}); setStep("connect"); }}>
              Leave the demo
            </button>
          </div>
        )}
        <header className="stage-head">
          <div>
            <h1>{heads[step][0]}</h1>
            <p className="sub">{heads[step][1]}</p>
          </div>
          <span className="spacer" />
          {(step === "review" || step === "listen") && plan.playlists.length > 0 && (
            <button className="btn primary" onClick={() => setStep("create")}>
              Create {final.length} playlists
            </button>
          )}
        </header>
        <div className={`stage-body${showStack ? "" : " single"}${showSample ? " has-sample" : ""}`}>
          {showStack && (
            <div className="pane" aria-label="Playlist stack">
              {showSample ? (
                <Stack plan={samplePlan} total={sample.length} leftOutCount={() => 0} caption="A sample stack: 60 well-known songs, sorted by the same models. Pick a cabinet to try it." onSelect={() => startDemo()} />
              ) : (
                <Stack
                  plan={plan}
                  total={total}
                  selected={step === "review" ? selectedKey : undefined}
                  leftOutCount={leftOutIn}
                  onSelect={(k) => {
                    setSelected(k);
                    setStep("review");
                  }}
                />
              )}
            </div>
          )}
          <div className="pane">{stage}</div>
        </div>
      </main>

      <Player track={focus} playing={playing} onPlayingChange={setPlaying} />
    </div>
  );
}
