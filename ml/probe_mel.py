"""Find the exact mel settings TensorflowInputMusiCNN uses by matching its output."""
import numpy as np, essentia.standard as es, itertools
rng = np.random.default_rng(0)
frames = [rng.standard_normal(512).astype(np.float32) * s for s in (0.01, 0.1, 0.5)]
ref = es.TensorflowInputMusiCNN()
R = np.array([ref(f) for f in frames])
best = []
for norm_win, mtype, normalize, warp in itertools.product([True, False], ["power", "magnitude"], ["unit_tri", "unit_sum", "unit_max"], ["slaneyMel", "htkMel"]):
    w = es.Windowing(type="hann", normalized=norm_win, zeroPadding=0)
    sp = es.Spectrum(size=512)
    mb = es.MelBands(inputSize=257, numberBands=96, sampleRate=16000, highFrequencyBound=8000, lowFrequencyBound=0,
                     warpingFormula=warp, weighting="linear", normalize=normalize, type=mtype)
    out = np.array([np.log10(mb(sp(w(f))) * 10000 + 1) for f in frames])
    best.append((float(np.abs(out - R).max()), norm_win, mtype, normalize, warp))
best.sort()
for b in best[:4]: print(b)
