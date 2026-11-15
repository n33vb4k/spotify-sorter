# spotify-sorter

Sort a cluttered Spotify **Liked Songs** library into genre playlists, by actually listening to the music.

Spotify no longer gives new developer apps genre tags, BPM or audio features, and its genre labels were
always artist-level and vague anyway ("UK dance"). This tool:

1. Pulls your liked songs, top tracks, recent plays and playlists via the Spotify Web API.
2. Grabs the free 30-second preview of each song from Deezer (matched by ISRC).
3. Runs [Essentia](https://essentia.upf.edu/)'s Discogs-EffNet models on the audio to tag each track with
   Discogs **styles** (400 of them: UK Garage, Bassline, Speed Garage, Dubstep, Drum n Bass, Minimal,
   Tech House, Trap, Grime, Neo Soul, ...) plus mood (relaxed / aggressive / danceable).
4. Creates **new, private** playlists from a plan you review first.

## Safety

- Never edits, reorders, removes from or deletes existing playlists or liked songs.
- `create` skips any playlist name you already have.
- `add` only works on playlists this tool created (tracked in `data/created_playlists.json`).
- Your data, tokens and client ID stay local (`data/`, `.token.json`, `config.json` are git-ignored).

## Setup

1. Create an app at <https://developer.spotify.com/dashboard>
   - Redirect URI: `http://127.0.0.1:8888/callback`
   - APIs: Web API
   - Development-mode apps only work for accounts you add under *User Management* (and may require Premium).
2. `cp config.example.json config.json` and paste your **Client ID** (no secret needed: PKCE login).
3. Python env (Essentia wheels currently need Python ≤ 3.11 on macOS arm64):
   ```sh
   uv venv -p 3.11 .venv && uv pip install -p .venv -r requirements.txt
   ```
4. Download models into `models/` from <https://essentia.upf.edu/models/>:
   - `feature-extractors/discogs-effnet/discogs-effnet-bs64-1.pb`
   - `classification-heads/genre_discogs400/genre_discogs400-discogs-effnet-1.{pb,json}`
   - optional: `classification-heads/mood_relaxed/`, `mood_aggressive/`, `danceability/` (`*-discogs-effnet-1.{pb,json}`)

## Usage

```sh
python3 spotify.py auth                 # log in (opens browser)
python3 spotify.py pull                 # download library -> data/
.venv/bin/python classify.py            # tag every liked song (resumable)
.venv/bin/python analyze.py "Artist - Title" ...   # optional: BPM / swing / kick / sub-bass readout
python3 spotify.py create plan.json     # create new playlists from a plan
python3 spotify.py add "Playlist" "Artist - Title" ...
```

A plan file is a list of `{"name", "description", "uris": [...]}`.

## Limits

- Skips aren't available via the API. Request **Extended streaming history** from Spotify
  (Account → Privacy → Download your data) for per-play `skipped` / `ms_played` data.
- 30-second previews sometimes miss the drop, and some tracks have no Deezer preview.
- The Discogs labels are a model's guess, so review the plan before creating.

## License

MIT
