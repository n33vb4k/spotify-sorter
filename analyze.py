import json, os, sys, urllib.request, urllib.parse, numpy as np, librosa, spotify
PREV = os.path.join(spotify.DATA, 'previews'); os.makedirs(PREV, exist_ok=True)
liked = {t['id']: t for t in json.load(open(os.path.join(spotify.DATA, 'liked.json')))}

def find(q):
    return [t for t in liked.values() if q.lower() in (', '.join(t['artists'])+' - '+t['name']).lower()][0]

def _deezer(url):
    return json.load(urllib.request.urlopen(url, timeout=15))


def _clean(title):
    return title.split(" - ")[0].split(" (feat")[0].split(" (with")[0].strip()


def preview(t):
    """Find the track's 30s preview on Deezer by artist + title and cache it."""
    path = os.path.join(PREV, t['id'] + '.mp3')
    if os.path.exists(path): return path
    artists = [x.lower() for x in t['artists']]
    q = urllib.parse.quote(f'artist:"{t["artists"][0]}" track:"{_clean(t["name"])}"')
    hits = _deezer('https://api.deezer.com/search?q=' + q).get('data', [])
    if not hits:
        hits = _deezer('https://api.deezer.com/search?q=' + urllib.parse.quote(f'{t["artists"][0]} {_clean(t["name"])}')).get('data', [])
    hits = [h for h in hits if h.get('preview') and h['artist']['name'].lower() in artists] or \
           [h for h in hits if h.get('preview') and any(a in h['title'].lower() or a in h['artist']['name'].lower() for a in artists)]
    if not hits: return None
    data = urllib.request.urlopen(hits[0]['preview'], timeout=30).read()
    with open(path, 'wb') as f: f.write(data)
    return path


def feats(path):
    y, sr = librosa.load(path, sr=22050, mono=True)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=512)); f = librosa.fft_frequencies(sr=sr)
    oenv = librosa.onset.onset_strength(y=y, sr=sr)
    tempo = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=oenv, sr=sr, start_bpm=135))[0])
    # pick 120-180 interpretation, prefer 125-145 band typical for garage/bassline
    cands = [tempo*k for k in (0.5, 2/3, 1, 1.5, 2) if 85 <= tempo*k <= 180]
    _, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, bpm=tempo)
    low = S[(f > 30) & (f < 150)].sum(0); hi = S[f > 5000].sum(0)
    lo_on = np.maximum(0, np.diff(low, prepend=low[0])); hi_on = np.maximum(0, np.diff(hi, prepend=hi[0]))
    # four-on-the-floor: share of beats with a strong low-end hit
    thr = np.percentile(lo_on, 85)
    fotf = np.mean([lo_on[max(0,b-1):b+2].max() > thr for b in beats]) if len(beats) else 0
    # swing: where do off-16th hats land between beats (0.25/0.75 straight, ~0.29-0.33 swung)
    pos = []
    hthr = np.percentile(hi_on, 80)
    for a, b in zip(beats[:-1], beats[1:]):
        seg = hi_on[a:b]
        for i in np.where(seg > hthr)[0]:
            p = i / (b - a)
            if 0.18 < p < 0.42: pos.append(p)
            if 0.68 < p < 0.92: pos.append(p - 0.5)
    swing = float(np.median(pos)) if pos else 0.25
    sub = float(S[(f > 20) & (f < 100)].sum() / S.sum())
    # bass wobble: amplitude modulation depth of the 40-200Hz band
    bass = S[(f > 40) & (f < 200)].sum(0); wob = float(np.std(np.diff(bass)) / (bass.mean() + 1e-9))
    flat = float(librosa.feature.spectral_flatness(y=y).mean())
    density = float(len(librosa.onset.onset_detect(onset_envelope=oenv, sr=sr)) / (len(y) / sr))
    return dict(bpm=round(tempo,1), alt_bpms=[round(c) for c in cands], kick_on_beats=round(fotf,2),
                swing=round(swing,3), sub_bass=round(sub,3), bass_wobble=round(wob,2),
                noisiness=round(flat,4), onsets_per_s=round(density,1))

if __name__ == '__main__':
    out = {}
    for q in sys.argv[1:]:
        t = find(q); p = preview(t)
        label = ', '.join(t['artists']) + ' - ' + t['name']
        if not p: print('NO PREVIEW:', label); continue
        out[label] = feats(p); print(label, out[label], flush=True)
    json.dump(out, open(os.path.join(spotify.DATA, 'audio_features.json'), 'w'), indent=1, ensure_ascii=False)
