"use client";
import { useState } from "react";
import { LEFTOVERS, type Plan, type TaggedTrack } from "@/lib/grouping";
import type { CreateResult } from "@/lib/spotify";
import { isValidClientId } from "@/lib/spotify";
import { styleName } from "@/lib/styles";
import { Icon } from "./Icon";

export function Promise_() {
  return (
    <ul className="promise">
      <li>
        <Icon name="lock" size={16} />
        <span>
          <b>Your existing playlists are never touched.</b> It only ever creates new, private ones, and shows you every song first.
        </span>
      </li>
      <li>
        <Icon name="speaker" size={16} />
        <span>
          <b>It listens on your device.</b> The style models run in this browser tab. Your library and listening history aren&apos;t uploaded anywhere.
        </span>
      </li>
    </ul>
  );
}

export function ConnectPanel({
  initialId,
  redirect,
  error,
  onConnect,
  onDemo,
}: {
  initialId: string;
  redirect: string;
  error?: string;
  onConnect: (id: string) => void;
  onDemo: () => void;
}) {
  const [id, setId] = useState(initialId);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const bad = touched && !isValidClientId(id);
  const isLocalhost = redirect.includes("//localhost");
  const uri = isLocalhost ? redirect.replace("//localhost", "//127.0.0.1") : redirect;
  return (
    <div className="prose">
      <p>
        It plays the 30-second preview of every song you&apos;ve liked, works out its style (UK garage, bassline, trap, neo soul… 400 of them) and mood, then
        stacks them into playlists for you to check before anything is created.
      </p>
      <Promise_ />
      <div className="row">
        <button type="button" className="btn" onClick={onDemo}>
          Try it on a sample library
        </button>
      </div>

      <h2>Connect your Spotify</h2>
      <p>
        Spotify only lets small apps like this one talk to accounts that brought their own app key, so you&apos;ll make a free one. It takes about five minutes,
        once.
      </p>
      <ol className="howto">
        <li>
          <span>
            Open the{" "}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              Spotify developer dashboard
            </a>{" "}
            and choose <b>Create app</b>. Any name works.
          </span>
        </li>
        <li>
          <span>
            Add this <b>redirect URI</b> and tick <b>Web API</b>:
            <span className="copyline" style={{ marginTop: 8 }}>
              <code>{uri}</code>
              <button
                type="button"
                className="btn quiet small"
                onClick={() => navigator.clipboard.writeText(uri).then(() => setCopied(true))}
              >
                <Icon name={copied ? "check" : "copy"} size={14} />
                {copied ? "Copied" : "Copy"}
              </button>
            </span>
            {isLocalhost && (
              <span className="hint" style={{ display: "block", marginTop: 8 }}>
                Spotify won&apos;t accept <code>localhost</code> addresses, so{" "}
                <a href={uri.replace("/callback", "/")}>reopen this page at 127.0.0.1</a> before you connect.
              </span>
            )}
          </span>
        </li>
        <li>
          <span>
            Save, then copy the app&apos;s <b>Client ID</b> into the box below. You don&apos;t need the client secret.
          </span>
        </li>
      </ol>
      <form
        className="field"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (isValidClientId(id)) onConnect(id);
        }}
      >
        <label htmlFor="client-id">Client ID</label>
        <input
          id="client-id"
          className="input"
          value={id}
          onChange={(e) => setId(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="32 letters and numbers"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={bad}
          aria-describedby="client-id-hint"
        />
        <span id="client-id-hint" className={bad ? "error-text" : "hint"}>
          {bad ? "That doesn't look like a Client ID: it should be 32 letters and numbers, from your app's settings." : "Saved in this browser only."}
        </span>
        <div className="row" style={{ marginTop: 8 }}>
          <button type="submit" className="btn primary">
            Connect Spotify
          </button>
        </div>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ScanPanel({ done, total, error, onRetry }: { done: number; total: number; error?: string; onRetry: () => void }) {
  return (
    <div className="now" aria-live="polite">
      <div className="big">{done}</div>
      <p>{total ? `of ${total} liked songs read from Spotify` : "Reading your liked songs from Spotify…"}</p>
      <div className="meter">
        <span style={{ width: total ? `${(done / total) * 100}%` : "4%" }} />
      </div>
      {error && (
        <>
          <p className="notice" role="alert">
            {error}
          </p>
          <div className="row">
            <button className="btn" onClick={onRetry}>
              Try again
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function ListenPanel({
  done,
  total,
  status,
  recent,
  plan,
  untagged,
  onStop,
  onReview,
}: {
  done: number;
  total: number;
  status: "loading" | "running" | "done" | "stopped" | "error";
  recent: TaggedTrack[];
  plan: Plan;
  untagged: number;
  onStop: () => void;
  onReview: () => void;
}) {
  const hueOf = (id: string) => plan.playlists.find((p) => p.key === plan.assignment[id]);
  return (
    <div className="now">
      <div className="big" aria-live="off">
        {done}
        <span style={{ color: "var(--k4)" }}> / {total}</span>
      </div>
      <p aria-live="polite">
        {status === "loading" && "Loading the listening models (about 20 MB, once)…"}
        {status === "running" && "Listening to previews and sorting them into the stack. You can start reviewing any time."}
        {status === "done" && `Done. ${untagged ? `${untagged} songs had no preview to listen to, so they're not in the plan.` : "Every song was tagged."}`}
        {status === "stopped" && "Paused. Tags so far are saved in this browser, so you can pick up where you left off."}
      </p>
      <div className="meter" aria-hidden>
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <div className="row">
        {status === "running" && (
          <button className="btn" onClick={onStop}>
            Pause
          </button>
        )}
        <button className="btn primary" onClick={onReview} disabled={!plan.playlists.length}>
          Review the stack
        </button>
      </div>
      {!!recent.length && (
        <ol className="log" aria-label="Recently tagged">
          {recent.map((t) => {
            const p = hueOf(t.id);
            return (
              <li key={t.id}>
                <span className="who">
                  <b>{t.name}</b>&ensp;{t.artists.join(", ")}
                </span>
                <span className="where">
                  {t.tags ? (
                    <>
                      <span className={`swatch${p?.key === LEFTOVERS ? " is-leftovers" : ""}`} style={{ ["--h" as string]: p?.hue ?? 0, ["--l" as string]: p?.light ?? 0.5 }} />
                      {styleName(t.tags.styles[0]?.[0] ?? "")}
                    </>
                  ) : (
                    <span style={{ color: "var(--k4)" }}>{t.error === "no preview" ? "no preview" : "skipped"}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function CreatePanel({
  final,
  demo,
  results,
  busy,
  error,
  onCreate,
}: {
  final: { name: string; uris: string[]; hue: number; light: number }[];
  demo: boolean;
  results: CreateResult[];
  busy: boolean;
  error?: string;
  onCreate: () => void;
}) {
  const byName = new Map(results.map((r) => [r.name, r]));
  const total = final.reduce((n, p) => n + p.uris.length, 0);
  const finished = results.length === final.length && results.length > 0;
  return (
    <div className="prose">
      <h2>
        {finished ? "Done. Your new playlists are in Spotify." : `${final.length} new private playlists, ${total} songs`}
      </h2>
      <p>
        {demo
          ? "This is the sample library, so nothing will be created. Connect your own Spotify to do this for real."
          : "Each one is created as a new private playlist. If you already have a playlist with the same name, that one is skipped and left exactly as it is."}
      </p>
      <ul className="manifest">
        {final.map((p) => {
          const r = byName.get(p.name);
          return (
            <li key={p.name}>
              <span className="swatch" style={{ ["--h" as string]: p.hue, ["--l" as string]: p.light }} />
              <span>
                {r?.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer">
                    {p.name}
                  </a>
                ) : (
                  p.name
                )}
                {r?.reason && <div className="hint" style={{ color: "var(--k5)", fontSize: "var(--step-0)" }}>{r.reason}</div>}
              </span>
              <span className="n">{p.uris.length}</span>
              <span className={`st ${r?.status ?? ""}`}>{r ? (r.status === "created" ? "Created" : "Skipped") : ""}</span>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!finished && (
        <div className="row">
          <button className="btn primary" onClick={onCreate} disabled={demo || busy || !final.length}>
            {busy ? "Creating…" : `Create ${final.length} playlists`}
          </button>
        </div>
      )}
    </div>
  );
}
