# ml/: reference pipeline and parity tests

The web app runs Essentia's Discogs-EffNet models in the browser with `onnxruntime-web`. Essentia's own
feature extractor (`TensorflowInputMusiCNN`) isn't available there, so it's reimplemented:

| Step | Setting (verified against Essentia) |
|---|---|
| Audio | mono, 16 kHz |
| Frames | 512 samples, hop 256, first frame centred on sample 0 (256 zeros prepended), partial tail dropped |
| Window | Hann, `0.5 - 0.5cos(2πn/(N-1))`, not normalised |
| Spectrum | magnitude of the 512-point real FFT (257 bins), then squared (power) |
| Mel | 96 bands, 0–8000 Hz, Slaney mel scale, triangles normalised to unit area |
| Compression | `log10(10000·x + 1)` |
| Patches | 128 frames, hop 62, partial tail dropped |
| Model | `discogs-effnet-bsdynamic-1.onnx` → `activations` (400 Discogs styles) + `embeddings` (1280-d) |
| Heads | mood/danceability ONNX heads take the embeddings; average over patches |

The EffNet `activations` output is identical to the separate `genre_discogs400` head, so no model conversion
is needed: only official ONNX files are used.

## Files

- `mel_reference.py`: numpy reference implementation (the TypeScript port mirrors it line for line).
- `probe_mel.py`: how the settings above were found (brute-force match against Essentia).
- `parity.py`: numpy + ONNX vs Essentia + TensorFlow on real previews. Current result: max error 1e-5.
- `make_fixture.py`: writes `web/test/fixtures/pipeline.json` from a synthetic signal for the TS tests.

```sh
scripts/fetch-models.sh ml/models
PYTHONPATH=ml cli/.venv/bin/python ml/parity.py 20
```
