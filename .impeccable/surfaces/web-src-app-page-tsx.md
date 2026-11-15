---
version: 1
slug: "web-src-app-page-tsx"
primary_target: "web/src/app/page.tsx"
related_targets: []
---

# Surface: spotify-sorter app (web/src/app)

Mode: Operate. One-page tool with a short intro state. Code-led build (Operate is always code-led).
Owner was offline; the decision page was skipped and the assigned direction taken unattended.

Audience/job: Spotify listeners with a cluttered Liked Songs library who want genre-true playlists
without hand-sorting. Task: connect (own Client ID) or try demo → scan → listen/tag → review plan → create.
Must stay untouched: existing playlists and liked songs; never imitate Spotify branding or logo.
Feels wrong if: it reads as a Spotify clone, a SaaS card grid, or a poster instead of a working tool.

## Direction contract

THESIS: Your library becomes a sound-system stack. Proposed playlists are cabinets you can see, size up
and open. It refuses the category default of a grey sidebar, a green accent and a flat table of playlists.

OWN-WORLD: matte plywood black (warm, not pure black), one tonal ramp of seven steps; hazard yellow #F5C400
is the action colour only. Every playlist owns a hue from a ten-step wheel (no yellows) that tints its
cabinet, chips and track markers. Grille-dot texture appears only on cabinet faces. Genre names and counts
are set in Big Shoulders Stencil Display, sprayed-on stencil lettering; everything else is Figtree with tabular numerals.
Raise (from exposure record): the seven-step ramp is the only neutral token set.
Raise (from tab board): each division owns a full-strength hue, and its size is proportional to its extent.
Raise (from labanotation): cabinet height is exactly proportional to song count, never rounded for looks.
Raise (from ticket wallet): nothing disappears. A removed song stays visible, struck through and marked
"left out", and can be restored.
Raise (from Crouwel grid): everything snaps to a 4px base grid; the stack's cabinets share one column grid.

STORY: The visitor sees their music sorted into a stack they recognise. They learn what their sounds are
called (each style has a one-line plain explanation), fix the few wrong ones, and create private playlists
knowing nothing else changes.

FIRST VIEWPORT: Left rail of five steps (Connect, Scan, Listen, Review, Create), current step marked,
completed steps ticked. Main stage: during Listen and Review, the stack fills the left 40%: cabinets
stacked bottom-up, each with its stencilled name, song count and hue. The right 60% shows the selected
cabinet's track list (title, artist, top styles as chips, mood bars, Move to… select, Leave out toggle).
Primary action, hazard-yellow, top right of the stage ("Create 9 playlists"). A bottom bar plays the 30-second preview of
the focused track. On Connect, the stage shows the Client ID setup beside a live demo stack.

FORM: sound-system speaker stack (UK bass culture), candidate 4 of 7; seed:343d1220a8565719.
Signature interaction: while Listen runs, each newly tagged song drops into its cabinet and the cabinet
grows by exactly one unit (a 160 ms ease-out height step); cabinet order re-sorts only between batches.
Motion grammar: height steps only; no fades on content; prefers-reduced-motion = instant.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
