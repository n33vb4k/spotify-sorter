# Product

<!-- impeccable:product-schema 1 -->

> Written overnight without an interview: the owner asked for unattended work. Facts marked
> *(inferred)* come from the brief and the build session, not a confirmed answer. Please review.

## Platform

web

## Stack

Delegated: Next.js (App Router) on Vercel's free tier. All audio tagging runs in the visitor's browser
(onnxruntime-web + Essentia's official ONNX models), so no paid or always-on server is needed. One small
route handler proxies Deezer search, which doesn't allow browser requests (CORS). Owner constraints: free to host, and nothing
running in a container on their machines.

## Users

- **Primary:** Spotify listeners whose Liked Songs have become one long, mixed pile across many genres.
  They like a lot of music but don't know subgenre names (e.g. bassline vs UKG vs 140), and want tidy,
  genre-true playlists without hand-sorting hundreds of songs. *(owner's own situation; generalised)*
- **Secondary:** people evaluating the project on GitHub or a portfolio. They need demo mode to see it
  work without a Spotify account. *(inferred)*

## Product Purpose

Listens to every liked song (30-second preview), tags it with Discogs styles and mood, proposes playlists
for the user to review, then creates them as **new, private** playlists. Success: the user's existing
library is untouched, and the new playlists feel right ("these all belong together") with little editing.

## Positioning

Sorts by **what the audio sounds like**, not by artist-level genre labels (Spotify no longer gives these to new apps, and they were
always vague). The models run on the user's own device, so the music and listening data never leave it.

## Operating Context

- Each user brings their **own Spotify Client ID**: dev-mode apps are capped to hand-added accounts,
  and extended quota is rarely granted. Setup must walk them through creating one (about 5 minutes).
- A full library (500–1500 songs) takes minutes to tag; the user watches progress or leaves the tab open.
- Spotify's streaming-history export (days to weeks to arrive) can be loaded later for skip analysis;
  it's parsed locally and never uploaded.
- The Spotify Web API rate-limits dev apps hard (a ~23 h block after about 760 single-track lookups was observed).
  Avoid per-track Spotify calls; match previews on Deezer by artist + title.

## Capabilities and Constraints

- Never edits, reorders, removes from or deletes a user's existing playlists or liked songs. Only
  creates new playlists, and only ever adds to playlists it created itself. Skips name clashes and
  duplicate songs.
- Tagging: 400 Discogs styles + relaxed / aggressive / happy / danceable. Some songs have no preview.
- Models are CC BY-NC-ND 4.0 (MTG-UPF): non-commercial, attributed, fetched rather than committed.
- Audio can't tell UK rap from US rap; artist rules exist for that. *(undecided: how rules surface in
  the web UI; v1 uses style-based grouping with the user editing the plan)*
- No backend storage or accounts; state lives in the browser.

## Brand Commitments

- Name: **spotify-sorter** (working name). Not affiliated with Spotify; must not imitate Spotify's
  brand or logo. "Spotify-esque" means a familiar dark, music-app feel, not a copy. *(owner asked for
  "a simple spotify esque ui")*
- Voice: plain and a little casual, like the owner ("sort out my playlists, declutter"). *(inferred)*

## Evidence on Hand

- Real accuracy evidence: the browser pipeline matches Essentia's TensorFlow pipeline to within 1e-5 (`ml/parity.py`).
- No testimonials, user counts or benchmarks exist. Don't fabricate any.
- Demo data must be a generic sample, never the owner's library.

## Product Principles

1. **Your library is sacred.** Only additive, only new, only private; show exactly what will happen first.
2. **Listen, don't guess.** Labels come from the audio; say when the model is unsure.
3. **Your data stays yours.** Processing happens on-device; say so plainly.
4. **Teach the genre map.** Users don't know subgenre names; short plain explanations help them
   recognise their own taste.

## Accessibility & Inclusion

*(inferred)* WCAG 2.2 AA: keyboard-operable review flow, visible focus, sufficient contrast on dark
surfaces, and progress announced to screen readers during long tagging runs. Respect reduced motion.
