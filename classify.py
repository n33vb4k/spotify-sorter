#!/usr/bin/env python3
"""Tag every liked song with Discogs styles + mood using Essentia models on 30s previews.

Usage: .venv/bin/python classify.py [--limit N]
Resumable: results are cached in data/essentia.json, so re-running only does new tracks.
"""
import json, os, sys
import numpy as np
import essentia
essentia.log.warningActive = False
essentia.log.infoActive = False
import essentia.standard as es
import spotify
from analyze import preview

MODELS = os.path.join(spotify.HERE, "models")
OUT = os.path.join(spotify.DATA, "essentia.json")
EMB = "discogs-effnet-bs64-1.pb"
HEADS = {  # name -> (model file, output node)
    "genre": ("genre_discogs400-discogs-effnet-1.pb", "PartitionedCall:0"),
    "relaxed": ("mood_relaxed-discogs-effnet-1.pb", "model/Softmax"),
    "aggressive": ("mood_aggressive-discogs-effnet-1.pb", "model/Softmax"),
    "danceable": ("danceability-discogs-effnet-1.pb", "model/Softmax"),
}


def load_models():
    emb = es.TensorflowPredictEffnetDiscogs(graphFilename=os.path.join(MODELS, EMB), output="PartitionedCall:1")
    heads, labels = {}, {}
    for name, (f, node) in HEADS.items():
        path = os.path.join(MODELS, f)
        if not os.path.exists(path):
            continue
        heads[name] = es.TensorflowPredict2D(graphFilename=path, input="serving_default_model_Placeholder"
                                             if name == "genre" else "model/Placeholder", output=node)
        meta = path.replace(".pb", ".json")
        if os.path.exists(meta):
            labels[name] = json.load(open(meta))["classes"]
    return emb, heads, labels


def tag(path, emb, heads, labels):
    audio = es.MonoLoader(filename=path, sampleRate=16000, resampleQuality=4)()
    e = emb(audio)
    out = {}
    for name, model in heads.items():
        p = model(e).mean(axis=0)
        if name == "genre":
            top = np.argsort(p)[::-1][:5]
            out["styles"] = [[labels["genre"][i], round(float(p[i]), 3)] for i in top]
        else:  # binary heads: index of the positive class
            cls = labels.get(name, [name, "not"])
            pos = 0 if not cls[0].startswith("non") and not cls[0].startswith("not") else 1
            out[name] = round(float(p[pos]), 3)
    return out


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    liked = json.load(open(os.path.join(spotify.DATA, "liked.json")))[:limit]
    done = json.load(open(OUT)) if os.path.exists(OUT) else {}
    emb, heads, labels = load_models()
    print("models:", ", ".join(heads), flush=True)
    for i, t in enumerate(liked, 1):
        if t["id"] in done:
            continue
        label = ", ".join(t["artists"]) + " - " + t["name"]
        try:
            p = preview(t)
            done[t["id"]] = dict(label=label, **tag(p, emb, heads, labels)) if p else {"label": label, "error": "no preview"}
        except Exception as ex:
            done[t["id"]] = {"label": label, "error": str(ex)[:200]}
        r = done[t["id"]]
        print(f"[{i}/{len(liked)}] {label} -> {r.get('styles', [[r.get('error')]])[0][0]}", flush=True)
        if i % 10 == 0:
            json.dump(done, open(OUT, "w"), indent=1, ensure_ascii=False)
    json.dump(done, open(OUT, "w"), indent=1, ensure_ascii=False)
    print("DONE", len(done), flush=True)


if __name__ == "__main__":
    main()
