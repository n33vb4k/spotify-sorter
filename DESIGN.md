---
name: spotify-sorter
description: Your liked songs, sorted by how they sound, shown as a sound-system stack you can size up and open.
colors:
  plywood-black: "oklch(0.155 0.008 65)"
  rail-black: "oklch(0.19 0.009 65)"
  raised-black: "oklch(0.23 0.01 65)"
  edge-grey: "oklch(0.3 0.011 65)"
  dust-grey: "oklch(0.47 0.012 70)"
  ash: "oklch(0.74 0.013 75)"
  chalk: "oklch(0.955 0.01 85)"
  hazard-yellow: "oklch(0.85 0.17 92)"
  hazard-press: "oklch(0.78 0.16 90)"
  alert-red: "oklch(0.68 0.17 32)"
typography:
  display:
    fontFamily: "Big Shoulders Stencil, Figtree, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1
  brand:
    fontFamily: "Big Shoulders Stencil, Figtree, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
  cabinet-label:
    fontFamily: "Big Shoulders Stencil, Figtree, sans-serif"
    fontSize: "clamp(0.95rem, 0.5 x face height, 2.75rem)"
    fontWeight: 800
    lineHeight: 1
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "tnum"
rounded:
  swatch: "2px"
  cabinet: "4px"
  inset: "6px"
  drop: "8px"
  control: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "28px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.hazard-yellow}"
    textColor: "{colors.plywood-black}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.hazard-press}"
  button-outline:
    textColor: "{colors.chalk}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "40px"
  button-quiet:
    textColor: "{colors.ash}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.raised-black}"
    textColor: "{colors.chalk}"
  button-small:
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "32px"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.rail-black}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.inset}"
    padding: "0 14px"
    height: "44px"
  select:
    backgroundColor: "{colors.rail-black}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.inset}"
    padding: "0 28px 0 10px"
    height: "30px"
    typography: "{typography.label}"
  chip:
    backgroundColor: "{colors.raised-black}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "22px"
    typography: "{typography.label}"
  cabinet:
    rounded: "{rounded.cabinet}"
    padding: "4px 10px"
    typography: "{typography.cabinet-label}"
  cabinet-leftovers:
    backgroundColor: "{colors.edge-grey}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.cabinet}"
  track-row:
    rounded: "{rounded.inset}"
    padding: "10px 8px"
  track-row-hover:
    backgroundColor: "{colors.rail-black}"
  player:
    backgroundColor: "{colors.rail-black}"
    padding: "0 20px"
    height: "72px"
  play-button:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.plywood-black}"
    rounded: "{rounded.control}"
    size: "40px"
---

# Design System: spotify-sorter

## Overview

**Creative North Star: "The Sound-System Stack"**

The library is a UK bass-culture speaker stack. Every proposed playlist is a cabinet: a matte, grille-dotted face in its own hue, stencilled with its name and song count, stacked bottom-up with the biggest at the base. The stack is a measuring instrument before it is a picture: a cabinet's height is its song count times one fixed unit, so the visitor sizes up their own music at a glance and opens a cabinet to see what is inside.

Everything around the stack is a working tool in warm plywood black: a left rail of five steps, a stage with the stack beside the open cabinet's track list, and a player bar along the bottom. The surround is quiet on purpose: one seven-step neutral ramp, one hazard yellow that only ever means "do this", and Figtree for every word that is not painted on a cabinet. Density is that of a tool, not a poster: 15px body, tabular numerals, rows rather than cards.

The world refuses the category default of a grey sidebar, a green accent and a flat table of playlists, and it never imitates Spotify's branding or logo.

**Key Characteristics:**
- Warm matte black surround built from exactly seven neutral steps.
- Hazard yellow is the action colour and nothing else.
- One OKLCH hue per playlist, tinting its cabinet, chips, swatches and heading.
- Stencil lettering only where a label is painted on equipment: cabinets, counts, the list heading, big numbers, the wordmark.
- Cabinet height exactly proportional to song count; motion is a height step and nothing else.

## Colors

Warm, slightly brown blacks under chalk text, with one loud safety yellow and a wheel of saturated playlist hues kept clear of it.

### Primary
- **Hazard Yellow** (hazard-yellow): fill of the primary button ("Create 9 playlists"), the focus ring (2px, 2px offset), the input caret, the focused input border, text selection, and the current-step dot in the rail. **Hazard Press** (hazard-press) is its hover/pressed state.

### Secondary: playlist hues
Each playlist owns a colour from the palette in `web/src/lib/grouping.ts` (`PALETTE`), stored as an OKLCH **[hue, lightness]** pair: hues 25, 150, 205, 270, 325, 45, 175, 235, 295, 0, 345, 190, with face lightness between 0.36 and 0.58. Lightness alternates so two nearby hues still separate. From that pair the build derives every tint at fixed chroma:
- **Cabinet face:** `oklch(L 0.12 H)`, text `oklch(0.97 0.03 H)`.
- **List heading / rename field:** `oklch(0.82 0.11 H)`.
- **Label beside a short cabinet:** `oklch(0.85 0.08 H)`.
- **Top-style chip:** background `oklch(0.36 0.07 H)`, percentage `oklch(0.85 0.05 H)`.
- **Swatch:** `oklch(L+0.08 0.13 H)`.
- **"Everything else"** carries no hue: its cabinet is Edge Grey, its swatch Dust Grey.

### Tertiary
- **Alert Red** (alert-red): invalid input border and error text only. A dark tint (`oklch(0.28 0.06 32)`) backs notices.

### Neutral (the seven-step ramp)
- **Plywood Black** (k0): page background; text on yellow and on the chalk play button.
- **Rail Black** (k1): rail, player bar, inputs, hovered track rows, blurbs.
- **Raised Black** (k2): chips, hover fills, current step, pane dividers, meter tracks.
- **Edge Grey** (k3): input and dashed outlines, the leftovers cabinet, scrollbar thumb.
- **Dust Grey** (k4): outline-button border, disabled text, strikethrough on left-out songs.
- **Ash** (k5): secondary text (artists, hints, captions, sub-headings).
- **Chalk** (k6): primary text, play button fill, selected-cabinet outline.

### Named Rules
**The Seven Steps Rule.** The k0–k6 ramp is the only neutral set. A new grey is a new step nobody agreed to; use the nearest of the seven.

**The Hazard Rule.** Hazard yellow marks what to do next: the primary action, focus, the caret, the current step. It is never a decoration, a playlist colour or a status tint.

**The Reserved Yellows Rule.** OKLCH hues 60–130 (yellows and yellow-greens) never go on a playlist, so no cabinet can be mistaken for a button.

**The Fixed Colour Rule.** A playlist keeps its colour for the whole session. Colours are assigned in rule order, not stack position, and once shown they are held, so re-sorting the stack never repaints a cabinet. When a playlist's preferred colour family (hues within 40°) is taken, it moves to the free slot furthest from the rest.

## Typography

**Display Font:** Big Shoulders Stencil, with the optical-size axis loaded (fallback Figtree, sans-serif)
**Body Font:** Figtree (fallback ui-sans-serif, system-ui, sans-serif)
**Mono:** ui-monospace / SF Mono / Menlo, for the Client ID input and inline code only.

**Character:** Stencil lettering sprayed onto equipment, against a plain, friendly sans that does the reading. The stencil is heavy (800) and set tight (line-height 1); Figtree is set at tool density with tabular numerals everywhere.

### Hierarchy
- **Display** (Stencil 800, 2.75rem / 44px, 1): the open cabinet's name above its track list (tinted with its hue) and big numbers on the Listen view.
- **Cabinet label** (Stencil 800, half the face height, clamped 0.95–2.75rem, 1): name and count painted on each cabinet face, with a 1px dark text shadow. Labels beside short cabinets are fixed at 0.9375rem.
- **Brand** (Stencil 800, 1.5rem, 1, +0.01em): the wordmark in the rail.
- **Title** (Figtree 700, 1.375rem / 22px, 1.2): the stage heading and prose section headings.
- **Body** (Figtree 400, 0.9375rem / 15px, 1.5): everything else; prose capped at 62–68ch. Titles in rows use weight 600.
- **Label** (Figtree 500–700, 0.8125rem / 13px): artists, hints, chips, captions, small buttons, the play log.

### Named Rules
**The Painted-On Rule.** Stencil appears only where a label would be painted onto equipment: cabinet names and counts, the open cabinet's heading, big numbers, the wordmark. Body copy, buttons, rail steps and track titles are always Figtree.

**The Tabular Rule.** Numerals are tabular throughout (`font-variant-numeric: tabular-nums` on body), so counts and timers do not jitter as they change.

## Layout

A fixed application shell, `100dvh` tall: a 232px rail on the left, the stage to its right, and a 72px player bar across the full width at the bottom. The stage has a head (min 76px; title left, primary action pushed to the right) above a two-pane body split **2fr : 3fr** (left pane min 280px): the stack on the left, the open cabinet's track list on the right, divided by a 1px Raised Black rule. Single-purpose steps use one column.

Spacing runs on a 4px grid: 4, 8, 12, 16, 20, 24, 28, 32. Panes pad 24px 28px 32px; the stage head pads 20px 28px 16px; the rail pads 20px 12px.

The stack is a reversed column: the biggest cabinet sits at the bottom and the stack sits at the foot of its pane. While tagging runs, a dashed Edge Grey outline at the full-library height shows how far the stack still has to fill.

**Below 900px** the shell collapses to one column: the rail becomes a horizontal strip of step dots, with only the current step labelled and the wordmark text and rail footer hidden; panes stack vertically with 16px side padding; the stage scrolls; the player drops its scrubber; track actions wrap under the title.

### Named Rules
**The Exact Height Rule.** A cabinet's face is `songs × unit` pixels, never rounded for looks. The unit is `560 / total songs`, clamped to 2–8px (halved in compact stacks). When a face is shorter than 22px, its label moves beside the cabinet (the face shrinks to 62% width) rather than the cabinet growing to fit it.

## Elevation & Depth

Flat and tonal. Depth comes from stepping up the black ramp (k0 page, k1 rail and player, k2 raised fills), not from drop shadows. The one exception is physical: cabinet faces carry a pair of inset shadows that read as a moulded front panel, plus the grille-dot texture.

### Shadow Vocabulary
- **Cabinet bevel** (`box-shadow: inset 0 -2px 0 oklch(0 0 0 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.08)`): cabinet faces only.
- **Stencil lift** (`text-shadow: 0 1px 0 oklch(0 0 0 / 0.35)`): cabinet labels only.

### Named Rules
**The Grille Rule.** The grille-dot texture (`radial-gradient(oklch(0 0 0 / 0.32) 1px, transparent 1.4px)` at 4px × 4px) appears only on cabinet faces. Nothing else in the app has texture.

## Shapes

Two shapes do the work. Cabinets are near-square boxes (4px radius), because they are equipment. Controls are full pills (999px): buttons, chips, the play button, step dots. Insets the hand touches, such as track rows, inputs, selects, blurbs, notices and rail steps, take a 6px radius. The file drop zone takes 8px, swatches 2px. Borders are 1.5px on controls and dashed outlines, 1px on dividers and the select.

## Components

### Buttons
Confident pills, bold Figtree (700), no icons unless an icon clarifies the action.
- **Shape:** full pill (999px), 40px tall, 20px side padding; small variant 32px tall, 14px padding, 13px text.
- **Primary:** Hazard Yellow fill and border, Plywood Black text. One per view, top right of the stage.
- **Outline (default):** transparent with a 1.5px Dust Grey border and Chalk text; border turns Chalk on hover.
- **Quiet:** borderless Ash text, 12px padding; hover fills Raised Black and turns text Chalk.
- **States:** active presses to `brightness(0.9)`; disabled at 45% opacity; background/border transitions 120ms. Focus is the global 2px Hazard ring.

### Chips
- **Style:** 22px pill, Raised Black fill, Chalk 13px/600 text, 8px padding. The top style is tinted with its playlist's hue (`oklch(0.36 0.07 H)`).
- **State:** a chip that opens a style's plain-language explanation shows a 1.5px Ash outline when expanded; hover brightens 1.2.

### Inputs / Fields
- **Text input:** 44px, Rail Black fill, 1.5px Edge Grey border, 6px radius, monospace with +0.02em tracking, Hazard caret. Hover border Dust Grey; focus border Hazard (no ring); invalid border Alert Red with 13px Alert Red error text below.
- **Select ("Move to…"):** 30px, Rail Black, 1px Edge Grey border, 6px radius, 13px text, custom chevron.

### Navigation (the rail)
Five steps (Connect, Scan, Listen, Review, Create) as full-width rows: 20px circular dot with a 1.5px current-colour ring, Ash label at 600. Hover and current fill Raised Black with Chalk text; the current dot fills Hazard; completed dots fill Ash with a tick. Disabled steps drop to Dust Grey.

### Track Row
A three-column grid (32px play button, title/artist, actions), 10px 8px padding, 6px radius, divided by 1px Rail Black rules; hover or focus fills Rail Black. The circular play button inverts to Chalk on hover. Below the title: a hue swatch, style chips, and mood bars (28px × 4px, Ash fill on Raised Black). A left-out song is never removed: its title and artist go Dust Grey and struck through, marked "left out", and can be restored.

### Player Bar
72px Rail Black bar under a 1px Raised Black rule: 44px artwork (4px radius) with title and artist, a 40px Chalk play/pause circle in the centre, and a 4px Chalk-on-Raised scrub meter on the right (hidden on mobile).

### The Stack (signature)
Cabinets in a reversed column with 3px gaps. Each cabinet is a button: hue face, grille dots, bevel, stencil name bottom-left and count bottom-right, 4px radius. Hover brightens 1.12; the selected cabinet gets a 2px Chalk outline at 2px offset and brightens 1.18. The only motion is height: as each song is tagged, its cabinet grows by one unit with a 160ms `cubic-bezier(0.16, 1, 0.3, 1)` step; order re-sorts only between batches. Under `prefers-reduced-motion` every transition is instant.

## Do's and Don'ts

### Do:
- **Do** take every neutral from the k0–k6 ramp and every playlist colour from the OKLCH [hue, lightness] palette.
- **Do** keep hazard yellow for the one primary action, focus, caret and current step.
- **Do** size cabinets exactly by song count (`songs × unit`) and move the label beside any face under 22px.
- **Do** keep a playlist's colour fixed for the session, assigned in rule order.
- **Do** set cabinet names, counts, the open-cabinet heading and big numbers in Big Shoulders Stencil 800; everything else in Figtree with tabular numerals.
- **Do** snap spacing to the 4px grid (4–32px).
- **Do** animate only height steps (160ms ease-out) and honour reduced motion with instant changes.
- **Do** keep removed songs visible, struck through and restorable.

### Don't:
- **Don't** give a playlist a hue between 60 and 130; those yellows belong to actions.
- **Don't** use hazard yellow as decoration, a playlist colour or a status tint.
- **Don't** put the grille texture or the cabinet bevel on anything but a cabinet face.
- **Don't** set buttons, body copy, rail steps or track titles in the stencil face.
- **Don't** fade content in or out, or animate anything other than a cabinet's height.
- **Don't** round cabinet heights up for looks or give short cabinets a minimum height.
- **Don't** imitate Spotify's green, logo or branding, and don't fall back to a grey sidebar with a flat playlist table.
- **Don't** use drop shadows for elevation; step up the black ramp instead.

### Known open issue
With more than about seven playlists in one stack, some cabinets can share a colour family: outside the reserved yellows the palette holds about nine distinguishable families (12 slots, several within 40° of each other), so the fallback picks the furthest free slot rather than a distinct family. Lightness alternation softens but does not solve it.
