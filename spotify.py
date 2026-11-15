#!/usr/bin/env python3
"""Spotify library helper (stdlib only).

Commands:
  auth                      log in via browser (PKCE, no client secret)
  pull                      download top tracks, liked songs, playlists, recent plays -> data/
  create <plan.json>        create NEW playlists from a plan file
  add <playlist> <q>...     add liked songs to a playlist this script created

Safety: this script never edits, reorders, removes from, or deletes existing
playlists or liked songs. `create` only adds tracks to playlists it created
itself in that same run (tracked in data/created_playlists.json).
"""
import base64, hashlib, http.server, json, os, secrets, sys, time, urllib.parse, urllib.request, webbrowser
from urllib.error import HTTPError

try:  # python.org macOS builds ship without CA certs; use certifi's bundle if present
    import certifi
    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

REDIRECT = "http://127.0.0.1:8888/callback"
SCOPES = ("user-library-read user-top-read user-read-recently-played "
          "playlist-read-private playlist-read-collaborative "
          "playlist-modify-private playlist-modify-public")
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
TOKEN = os.path.join(HERE, ".token.json")
API = "https://api.spotify.com/v1"


def _client_id():
    cid = os.environ.get("SPOTIFY_CLIENT_ID")
    cfg = os.path.join(HERE, "config.json")
    if not cid and os.path.exists(cfg):
        cid = json.load(open(cfg)).get("client_id")
    if not cid:
        sys.exit("No Spotify client ID. Copy config.example.json to config.json and fill it in "
                 "(or set SPOTIFY_CLIENT_ID). See README.")
    return cid


# ---------- auth ----------
def _post_token(params):
    req = urllib.request.Request("https://accounts.spotify.com/api/token",
                                 data=urllib.parse.urlencode(params).encode(),
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req) as r:
        tok = json.load(r)
    tok["expires_at"] = time.time() + tok["expires_in"] - 60
    if "refresh_token" not in tok and os.path.exists(TOKEN):
        tok["refresh_token"] = json.load(open(TOKEN))["refresh_token"]
    with open(TOKEN, "w") as f:
        json.dump(tok, f)
    os.chmod(TOKEN, 0o600)
    return tok


def auth():
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)
    url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode({
        "client_id": _client_id(), "response_type": "code", "redirect_uri": REDIRECT,
        "code_challenge_method": "S256", "code_challenge": challenge, "scope": SCOPES, "state": state})
    result = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if q.get("state", [None])[0] == state:
                result.update({k: v[0] for k, v in q.items()})
            self.send_response(200); self.send_header("Content-Type", "text/html"); self.end_headers()
            self.wfile.write(b"<h2>Done - you can close this tab.</h2>")
        def log_message(self, *a): pass

    srv = http.server.HTTPServer(("127.0.0.1", 8888), H)
    print("Opening browser for Spotify login. If it doesn't open, visit:\n" + url, flush=True)
    webbrowser.open(url)
    while "code" not in result and "error" not in result:
        srv.handle_request()
    if "error" in result:
        sys.exit("Auth failed: " + result["error"])
    _post_token({"grant_type": "authorization_code", "code": result["code"], "redirect_uri": REDIRECT,
                 "client_id": _client_id(), "code_verifier": verifier})
    print("Logged in. Token saved.")


def token():
    if not os.path.exists(TOKEN):
        sys.exit("Not logged in. Run: python3 spotify.py auth")
    tok = json.load(open(TOKEN))
    if time.time() > tok["expires_at"]:
        tok = _post_token({"grant_type": "refresh_token", "refresh_token": tok["refresh_token"], "client_id": _client_id()})
    return tok["access_token"]


# ---------- api ----------
def api(method, path, body=None):
    url = path if path.startswith("http") else API + path
    for attempt in range(6):
        req = urllib.request.Request(url, method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                raw = r.read()
                return json.loads(raw) if raw else {}
        except HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "2"))
                if wait > 120:
                    raise RuntimeError(f"Spotify rate limit: try again in {wait // 3600}h{wait % 3600 // 60}m")
                time.sleep(wait + 1); continue
            if e.code >= 500 and attempt < 5:
                time.sleep(2); continue
            raise RuntimeError(f"{method} {url} -> {e.code}: {e.read().decode()[:300]}")


def paged(path):
    out, url = [], path
    while url:
        page = api("GET", url)
        out += page.get("items", [])
        url = page.get("next")
    return out


def slim(t):
    if not t or not t.get("id"):
        return None
    return {"id": t["id"], "uri": t["uri"], "name": t["name"],
            "artists": [a["name"] for a in t["artists"]], "artist_ids": [a["id"] for a in t["artists"]],
            "album": t["album"]["name"], "release": t["album"].get("release_date"),
            "popularity": t.get("popularity")}


# ---------- commands ----------
def pull():
    os.makedirs(DATA, exist_ok=True)
    me = api("GET", "/me")
    save("me.json", {"id": me["id"], "name": me.get("display_name"), "product": me.get("product")})

    top = {}
    for rng in ("short_term", "medium_term", "long_term"):
        top[rng] = [slim(t) for t in paged(f"/me/top/tracks?limit=50&time_range={rng}")]
    save("top_tracks.json", top)
    print("top tracks:", {k: len(v) for k, v in top.items()})

    liked = [dict(slim(i["track"]) or {}, added_at=i["added_at"]) for i in paged("/me/tracks?limit=50")]
    liked = [t for t in liked if t.get("id")]
    save("liked.json", liked)
    print("liked songs:", len(liked))

    recent = [dict(slim(i["track"]) or {}, played_at=i["played_at"]) for i in api("GET", "/me/player/recently-played?limit=50")["items"]]
    save("recent.json", recent)
    print("recent plays:", len(recent))

    pls = []
    for p in paged("/me/playlists?limit=50"):
        entry = {"id": p["id"], "name": p["name"], "owner": p["owner"]["id"],
                 "mine": p["owner"]["id"] == me["id"], "tracks": []}
        if entry["mine"]:
            try:
                items = paged(f"/playlists/{p['id']}/items?limit=50")
            except RuntimeError:
                items = paged(f"/playlists/{p['id']}/tracks?limit=50")
            entry["tracks"] = [s for s in (slim(i.get("item") or i.get("track")) for i in items) if s]
        pls.append(entry)
    save("playlists.json", pls)
    print("playlists:", len(pls), "(own:", sum(p["mine"] for p in pls), ")")


def create(plan_path):
    """plan.json: [{"name", "description", "uris": [...], "add_to_existing": false}]
    add_to_existing=true appends to a playlist THIS tool created; anything else makes a new playlist."""
    plan = json.load(open(plan_path))
    existing = {p["name"].lower() for p in json.load(open(os.path.join(DATA, "playlists.json")))}
    log_path = os.path.join(DATA, "created_playlists.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else []
    created = {p["name"]: p["id"] for p in log}
    for pl in plan:
        if pl.get("add_to_existing"):
            if pl["name"] not in created:
                print(f"SKIP '{pl['name']}': not a playlist this tool created (won't touch it)"); continue
            _add_uris(created[pl["name"]], pl["uris"])
            print(f"Added {len(pl['uris'])} tracks to '{pl['name']}'"); continue
        if pl["name"].lower() in existing:
            print(f"SKIP '{pl['name']}': a playlist with that name already exists (won't touch it)")
            continue
        body = {"name": pl["name"], "description": pl.get("description", ""), "public": False}
        try:
            new = api("POST", "/me/playlists", body)
        except RuntimeError:
            new = api("POST", f"/users/{json.load(open(os.path.join(DATA, 'me.json')))['id']}/playlists", body)
        log.append({"id": new["id"], "name": pl["name"]})
        with open(log_path, "w") as f:
            json.dump(log, f, indent=1)
        _add_uris(new["id"], pl["uris"])
        print(f"Created '{pl['name']}' with {len(pl['uris'])} tracks")


def _add_uris(pid, uris):
    """Append uris to a playlist, skipping any already in it."""
    try:
        have = {(i.get("item") or i.get("track") or {}).get("uri") for i in paged(f"/playlists/{pid}/items?limit=50")}
    except RuntimeError:
        have = {(i.get("track") or {}).get("uri") for i in paged(f"/playlists/{pid}/tracks?limit=50")}
    uris = [u for u in dict.fromkeys(uris) if u not in have]
    for i in range(0, len(uris), 100):
        chunk = {"uris": uris[i:i + 100]}
        try:
            api("POST", f"/playlists/{pid}/items", chunk)
        except RuntimeError as e:
            if "rate limit" in str(e): raise
            api("POST", f"/playlists/{pid}/tracks", chunk)


def add(name, queries):
    """Add liked songs (matched by 'artist - title' substring) to a playlist THIS script created."""
    created = {p["name"]: p["id"] for p in json.load(open(os.path.join(DATA, "created_playlists.json")))}
    if name not in created:
        sys.exit(f"'{name}' was not created by this script - refusing to modify it")
    liked = json.load(open(os.path.join(DATA, "liked.json")))
    uris = []
    for q in queries:
        m = [t for t in liked if q.lower() in (", ".join(t["artists"]) + " - " + t["name"]).lower()]
        if len(m) != 1: sys.exit(f"'{q}' matched {len(m)} liked songs")
        uris.append(m[0]["uri"]); print("  +", ", ".join(m[0]["artists"]), "-", m[0]["name"])
    _add_uris(created[name], uris)
    print(f"Added {len(uris)} to '{name}'")


def save(name, obj):
    with open(os.path.join(DATA, name), "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "auth": auth()
    elif cmd == "pull": pull()
    elif cmd == "create" and len(sys.argv) == 3: create(sys.argv[2])
    elif cmd == "add" and len(sys.argv) > 3: add(sys.argv[2], sys.argv[3:])
    else: print(__doc__)
