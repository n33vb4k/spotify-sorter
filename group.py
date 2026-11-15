#!/usr/bin/env python3
"""Turn Essentia tags + a rules file into a playlist plan.

Usage: python3 group.py rules.json [--out plan.json]

rules.json:
{
  "skip_existing_plan": true,          # leave out songs already in playlists this tool created
  "playlists": [                       # first match wins, so order matters
    {"name": "Grime", "description": "...",
     "artists": ["Skepta", "Jme"],     # any credited artist matches (case-insensitive)
     "styles": ["Hip Hop---Grime"],    # top Essentia style, a full "Genre---Style" or just "Genre"
     "max_aggressive": 0.5,            # optional mood filters (0-1)
     "min_relaxed": 0.6,
     "add_to_existing": false},        # true = append to a playlist this tool already created
    ...
  ]
}
Artist rules are checked for every playlist first, then style rules, so an artist rule always beats
a style guess. Unmatched songs go to data/unsorted.txt for review.
"""
import json, os, sys
import spotify


def matches_style(top, styles):
    return any(top == s or top.split("---")[0] == s for s in styles)


def mood_ok(e, rule):
    if "max_aggressive" in rule and e.get("aggressive", 0) > rule["max_aggressive"]:
        return False
    if "min_relaxed" in rule and e.get("relaxed", 0) < rule["min_relaxed"]:
        return False
    return True


def main():
    rules = json.load(open(sys.argv[1]))
    out_path = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "plan.json"
    liked = json.load(open(os.path.join(spotify.DATA, "liked.json")))
    tags = json.load(open(os.path.join(spotify.DATA, "essentia.json")))
    skip = set()
    if rules.get("skip_existing_plan"):
        for f in rules.get("existing_plans", []):
            skip |= {u for p in json.load(open(f)) for u in p["uris"]}
    pls = rules["playlists"]
    for p in pls:
        p["_artists"] = {a.lower() for a in p.get("artists", [])}
    buckets = {p["name"]: [] for p in pls}
    unsorted = []
    for t in liked:
        if t["uri"] in skip or not t["artists"][0]:
            continue
        e = tags.get(t["id"], {})
        top = e.get("styles", [[""]])[0][0]
        arts = {a.lower() for a in t["artists"]}
        # artist rules: the first-credited artist decides; then any credited artist
        hit = next((p for p in pls if t["artists"][0].lower() in p["_artists"]), None) \
            or next((p for p in pls if arts & p["_artists"]), None)
        if not hit and top:
            hit = next((p for p in pls if p.get("styles") and matches_style(top, p["styles"]) and mood_ok(e, p)), None)
        label = ", ".join(t["artists"]) + " - " + t["name"]
        if hit:
            buckets[hit["name"]].append((t, top))
        else:
            unsorted.append(f"{label}  [{top or 'no tags'}]")
    plan = []
    for p in pls:
        items = buckets[p["name"]]
        print(f"\n## {p['name']} ({len(items)}){'  [add to existing]' if p.get('add_to_existing') else ''}")
        for t, top in items:
            print(f"   {', '.join(t['artists'])} - {t['name']}  [{top.split('---')[-1]}]")
        if items:
            plan.append({"name": p["name"], "description": p.get("description", ""),
                         "add_to_existing": p.get("add_to_existing", False), "uris": [t["uri"] for t, _ in items]})
    with open(os.path.join(spotify.DATA, "unsorted.txt"), "w") as f:
        f.write("\n".join(unsorted))
    print(f"\nunsorted: {len(unsorted)} (see data/unsorted.txt)")
    json.dump(plan, open(out_path, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
