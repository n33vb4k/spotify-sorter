"use client";
import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/grouping";
import { findPreview } from "@/lib/runner";
import { Icon } from "./Icon";

const previewCache = new Map<string, string | null>();

/** Bottom bar that plays the 30-second Deezer preview of the focused song. */
export function Player({ track, playing, onPlayingChange }: { track?: Track; playing: boolean; onPlayingChange: (p: boolean) => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "none">("idle");

  useEffect(() => {
    const el = audio.current;
    if (!el || !track) return;
    let cancelled = false;
    setProgress(0);
    (async () => {
      setStatus("loading");
      let url = previewCache.get(track.id);
      if (url === undefined) {
        url = await findPreview(track).catch(() => null);
        previewCache.set(track.id, url);
      }
      if (cancelled) return;
      if (!url) {
        setStatus("none");
        onPlayingChange(false);
        return;
      }
      setStatus("idle");
      el.src = url;
      if (playing) el.play().catch(() => onPlayingChange(false));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id]);

  useEffect(() => {
    const el = audio.current;
    if (!el || !el.src) return;
    if (playing && el.paused) el.play().catch(() => onPlayingChange(false));
    if (!playing && !el.paused) el.pause();
  }, [playing, onPlayingChange]);

  const secs = Math.round(progress * 30);
  return (
    <footer className="player" aria-label="Preview player">
      <div className="np">
        <div className="art" aria-hidden />
        <div style={{ minWidth: 0 }}>
          <div className="t">{track ? track.name : "Nothing playing"}</div>
          <div className="a">
            {track ? (status === "none" ? "No preview available for this song" : track.artists.join(", ")) : "Press play on any song to hear its 30-second preview"}
          </div>
        </div>
      </div>
      <button type="button" className="pp" disabled={!track || status === "none"} onClick={() => onPlayingChange(!playing)} aria-label={playing ? "Pause" : "Play"}>
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
      <div className="scrub">
        <span>0:{String(secs).padStart(2, "0")}</span>
        <div className="meter" role="progressbar" aria-label="Preview position" aria-valuemin={0} aria-valuemax={30} aria-valuenow={secs}>
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        <span>0:30</span>
      </div>
      <audio
        ref={audio}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 30))}
        onEnded={() => onPlayingChange(false)}
        onPause={() => onPlayingChange(false)}
        onPlay={() => onPlayingChange(true)}
        preload="none"
      />
    </footer>
  );
}
