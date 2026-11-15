"use client";
import { useEffect, useState } from "react";
import { finishLogin } from "@/lib/spotify";

export default function Callback() {
  const [msg, setMsg] = useState("Finishing Spotify login…");
  useEffect(() => {
    finishLogin(new URLSearchParams(window.location.search)).then((err) => {
      if (err) {
        setMsg(err);
        window.location.replace(`/?error=${encodeURIComponent(err)}`);
      } else window.location.replace("/?step=scan");
    });
  }, []);
  return (
    <main style={{ display: "grid", placeItems: "center", height: "100dvh", color: "var(--k5)" }}>
      <p role="status">{msg}</p>
    </main>
  );
}
