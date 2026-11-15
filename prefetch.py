"""Download Deezer previews for all liked songs in parallel (cached in data/previews/)."""
import json, os
from concurrent.futures import ThreadPoolExecutor
import spotify
from analyze import preview
liked = json.load(open(os.path.join(spotify.DATA, "liked.json")))
def go(t):
    try: return bool(preview(t))
    except Exception: return False
with ThreadPoolExecutor(3) as ex:
    res = list(ex.map(go, liked))
print(f"previews: {sum(res)}/{len(res)}")
