"""Build web/public/demo/library.json: a generic sample library tagged with the real pipeline.

Only song names, artists and model tags are stored (no audio). Tracks are well-known songs across genres,
chosen to show off the sorter; they are not anyone's personal library.
Usage (from repo root): cd cli && .venv/bin/python ../ml/make_demo.py
"""
import hashlib, json, os, sys
sys.path.insert(0, os.getcwd())
from analyze import preview
from classify import load_models, tag

SONGS = """Craig David, Artful Dodger|Re-Rewind
MJ Cole|Sincere
Sweet Female Attitude|Flowers
DJ Luck & MC Neat|A Little Bit of Luck
Shanks & Bigfoot|Sweet Like Chocolate
So Solid Crew|21 Seconds
DJ Q|You Wot!
T2|Heartbroken
Jaimeson|True
Pendulum|Watercolour
Sub Focus|Rock It
Roni Size|Brown Paper Bag
Goldie|Inner City Life
Netsky|Come Alive
Shy FX, T Power|Shake Ur Body
Daft Punk|Around the World
FISHER|Losing It
Stardust|Music Sounds Better With You
Robin S|Show Me Love
Peggy Gou|(It Goes Like) Nanana
Skream|Midnight Request Line
Benga|Night
Rusko|Woo Boost
Nas|N.Y. State of Mind
A Tribe Called Quest|Can I Kick It?
Wu-Tang Clan|C.R.E.A.M.
Dr. Dre, Snoop Dogg|Still D.R.E.
Migos|Bad and Boujee
Travis Scott|SICKO MODE
Future|Mask Off
Wiley|Wearing My Rolex
Stormzy|Shut Up
Dizzee Rascal|Fix Up, Look Sharp
Kano|P's and Q's
Frank Ocean|Thinkin Bout You
Amy Winehouse|Back to Black
D'Angelo|Untitled (How Does It Feel)
SZA|Good Days
Bonobo|Kerala
Massive Attack|Teardrop
Tame Impala|The Less I Know The Better
Khruangbin|Maria También
Portishead|Glory Box
Arctic Monkeys|Do I Wanna Know?
The Strokes|Last Nite
Oasis|Wonderwall
Nirvana|Smells Like Teen Spirit
Dua Lipa|Levitating
Harry Styles|As It Was
The Weeknd|Blinding Lights
Bob Marley & The Wailers|Is This Love
Sean Paul|Temperature
Bad Bunny|Tití Me Preguntó
Burial|Archangel
Fred again..|Delilah (pull me out of this)
Joy Orbison|Hyph Mngo
Overmono|So U Kno
Floating Points|LesAlpx
Mall Grab|Can't
Kenny Beats, Vince Staples|Magic""".splitlines()

emb, heads, labels = load_models()
out = []
for i, line in enumerate(SONGS):
    artists, name = line.split("|")
    t = {"id": "demo" + hashlib.sha1(line.encode()).hexdigest()[:18], "name": name, "artists": [a.strip() for a in artists.split(",")]}
    t["uri"] = "spotify:track:" + t["id"]
    p = preview(t)
    entry = dict(t)
    if p:
        r = tag(p, emb, heads, labels)
        entry["tags"] = {"styles": r["styles"], "moods": {k: r[k] for k in ("relaxed", "aggressive", "danceable") if k in r}}
    else:
        entry["error"] = "no preview"
    out.append(entry)
    print(i, line, "->", entry.get("tags", {}).get("styles", [["-"]])[0][0], flush=True)
os.makedirs("../web/public/demo", exist_ok=True)
json.dump({"note": "Sample library for demo mode; tags computed by ml/make_demo.py. Song names only, no audio.", "tracks": out},
          open("../web/public/demo/library.json", "w"), ensure_ascii=False, indent=0)
