# spotify-sorter

Sort a cluttered Spotify **Liked Songs** library into genre playlists, by actually listening to the music.

Spotify no longer gives new developer apps genre tags, BPM or audio features. spotify-sorter grabs each
song's free 30-second preview, runs [Essentia](https://essentia.upf.edu/)'s Discogs-EffNet models on the
audio to tag it with Discogs styles (UK Garage, Bassline, Drum n Bass, Trap, Neo Soul, ... 400 in all)
plus mood, then creates **new, private** playlists from a plan you review first. It never edits your
existing playlists.

| Folder | What |
|---|---|
| [`cli/`](cli/) | Python command-line version (Spotify API + Essentia). |
| [`web/`](web/) | Next.js web app: runs the models in your browser, so nothing needs a server. |
| [`ml/`](ml/) | Reference pipeline and parity tests proving the browser version matches Essentia. |

**How it works and why:** see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How accurate is the browser version?

It reproduces Essentia's own TensorFlow pipeline: within 1e-5 on 20 real tracks in Python (`ml/parity.py`),
and 12/12 identical top styles end to end in a real browser, including browser MP3 decoding.

## License

Code: MIT. The Essentia models are © MTG-UPF and licensed
[CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) (non-commercial use, with
attribution). They are downloaded at build or run time, not stored in this repo.
