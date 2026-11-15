#!/usr/bin/env bash
# Download the official Essentia ONNX models (CC BY-NC-ND 4.0, © MTG-UPF) used by the web app and ml/ tests.
# The Essentia server is slow and drops connections, so every file is retried.
set -euo pipefail
DEST="${1:-web/public/models}"
BASE="https://essentia.upf.edu/models"
FILES=(
  feature-extractors/discogs-effnet/discogs-effnet-bsdynamic-1.onnx
  feature-extractors/discogs-effnet/discogs-effnet-bsdynamic-1.json
  classification-heads/mood_relaxed/mood_relaxed-discogs-effnet-1.onnx
  classification-heads/mood_aggressive/mood_aggressive-discogs-effnet-1.onnx
  classification-heads/mood_happy/mood_happy-discogs-effnet-1.onnx
  classification-heads/danceability/danceability-discogs-effnet-1.onnx
)
mkdir -p "$DEST"
for f in "${FILES[@]}"; do
  out="$DEST/$(basename "$f")"
  [ -s "$out" ] && { echo "have $(basename "$f")"; continue; }
  for i in $(seq 1 15); do
    if curl -sf -m 300 --http1.1 -L -o "$out.part" "$BASE/$f"; then mv "$out.part" "$out"; echo "got  $(basename "$f")"; break; fi
    echo "retry $i $(basename "$f")" >&2; sleep 3
  done
  [ -s "$out" ] || { echo "FAILED $f" >&2; exit 1; }
done
