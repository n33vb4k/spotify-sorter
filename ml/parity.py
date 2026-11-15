"""End-to-end parity: numpy mel + official ONNX models vs Essentia's TensorFlow pipeline.

Usage (from repo root, with the CLI venv + models downloaded):
  PYTHONPATH=ml cli/.venv/bin/python ml/parity.py [n_previews]
"""
import glob, json, sys, numpy as np, onnxruntime as ort
import essentia, essentia.standard as es
essentia.log.warningActive = False
from mel_reference import musicnn_bands, mel_filterbank, frames, patches

M = "ml/models/"
labels = json.load(open(M + "discogs-effnet-bsdynamic-1.json"))["classes"]
effnet = ort.InferenceSession(M + "discogs-effnet-bsdynamic-1.onnx")
relax = ort.InferenceSession(M + "mood_relaxed-discogs-effnet-1.onnx")
FB = mel_filterbank()

ess_emb = es.TensorflowPredictEffnetDiscogs(graphFilename="cli/models/discogs-effnet-bs64-1.pb", output="PartitionedCall:1")
ess_head = es.TensorflowPredict2D(graphFilename="cli/models/genre_discogs400-discogs-effnet-1.pb",
                                  input="serving_default_model_Placeholder", output="PartitionedCall:0")
ess_relax = es.TensorflowPredict2D(graphFilename="cli/models/mood_relaxed-discogs-effnet-1.pb", output="model/Softmax")
files = sorted(glob.glob("cli/data/previews/*.mp3"))[: int(sys.argv[1]) if len(sys.argv) > 1 else 20]
worst = 0.0
for f in files:
    audio = es.MonoLoader(filename=f, sampleRate=16000, resampleQuality=4)()
    E = ess_emb(audio); G = ess_head(E).mean(0); R = ess_relax(E).mean(0)
    mel = np.array([musicnn_bands(x, FB) for x in frames(audio)], np.float32)
    act, emb = effnet.run(None, {"melspectrogram": patches(mel)})
    r = relax.run(None, {"embeddings": emb})[0].mean(0)
    err = max(np.abs(G - act.mean(0)).max(), np.abs(R - r).max())
    worst = max(worst, err)
    print(f"err={err:.5f} top={labels[G.argmax()].split('---')[1]:<16} onnx_top={labels[act.mean(0).argmax()].split('---')[1]}")
print(f"WORST {worst:.5f} over {len(files)} tracks")
sys.exit(0 if worst < 1e-3 else 1)
