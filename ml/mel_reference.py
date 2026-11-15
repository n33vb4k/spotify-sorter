"""Pure-numpy reimplementation of Essentia's TensorflowInputMusiCNN, checked against Essentia itself.

The TypeScript port in web/ mirrors `mel_filterbank` and `musicnn_bands` exactly.
"""
import numpy as np

SR, N_FFT, N_MELS, F_MAX = 16000, 512, 96, 8000.0


def hz2mel(f):  # Slaney
    f = np.asarray(f, dtype=np.float64)
    lin = f / (200.0 / 3)
    log = 15.0 + np.log(np.maximum(f, 1e-12) / 1000.0) / (np.log(6.4) / 27.0)
    return np.where(f < 1000.0, lin, log)


def mel2hz(m):
    m = np.asarray(m, dtype=np.float64)
    lin = m * (200.0 / 3)
    log = 1000.0 * np.exp((np.log(6.4) / 27.0) * (m - 15.0))
    return np.where(m < 15.0, lin, log)


def mel_filterbank():
    n_bins = N_FFT // 2 + 1
    edges = mel2hz(np.linspace(hz2mel(0.0), hz2mel(F_MAX), N_MELS + 2))
    freqs = np.arange(n_bins) * (SR / 2) / (n_bins - 1)
    fb = np.zeros((N_MELS, n_bins))
    for i in range(N_MELS):
        lo, mid, hi = edges[i], edges[i + 1], edges[i + 2]
        up = (freqs - lo) / (mid - lo)
        down = (hi - freqs) / (hi - mid)
        fb[i] = np.maximum(0, np.minimum(up, down))
        fb[i] *= 2.0 / (hi - lo)  # unit_tri: each triangle has unit area
    return fb


def hann(n=N_FFT):
    return 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(n) / (n - 1))


def frames(audio, n=N_FFT, hop=256):
    """Essentia FrameCutter defaults: first frame centred on sample 0 (half-frame zero pad), drop partial tail."""
    audio = np.concatenate([np.zeros(n // 2, np.float32), np.asarray(audio, np.float32)])
    return np.array([audio[i:i + n] for i in range(0, len(audio) - n + 1, hop)])


def patches(mel, size=128, hop=62):
    """EffNet input: 128-frame patches every 62 frames; a trailing partial patch is discarded."""
    return np.array([mel[i:i + size] for i in range(0, len(mel) - size + 1, hop)], np.float32)


def musicnn_bands(frame, fb=None):
    fb = mel_filterbank() if fb is None else fb
    spec = np.abs(np.fft.rfft(frame * hann()))
    return np.log10(fb @ (spec ** 2) * 10000 + 1)


if __name__ == "__main__":
    import essentia.standard as es
    mb = es.MelBands(inputSize=257, numberBands=96, sampleRate=16000, highFrequencyBound=8000, lowFrequencyBound=0,
                     warpingFormula="slaneyMel", weighting="linear", normalize="unit_tri", type="power")
    ess_fb = np.array([mb(np.sqrt(np.eye(257, dtype=np.float32)[k])) for k in range(257)]).T
    fb = mel_filterbank()
    rel = np.abs(fb - ess_fb).max() / ess_fb.max()
    print("filterbank max rel err:", rel)
    if rel > 1e-3:
        # diagnose: scale ratio and support
        i = 10; nz = ess_fb[i] > 0
        print("band", i, "ess nz bins", np.where(nz)[0], "mine", np.where(fb[i] > 0)[0])
        print("ratio", (ess_fb[i][nz] / np.where(fb[i][nz] == 0, np.nan, fb[i][nz])))
    ref = es.TensorflowInputMusiCNN()
    rng = np.random.default_rng(1)
    errs = [np.abs(musicnn_bands(f) - ref(f.astype(np.float32))).max()
            for f in (rng.standard_normal(512) * s for s in (0.001, 0.05, 0.3, 1.0))]
    print("bands max abs err:", max(errs))
    np.save("ml/essentia_filterbank.npy", ess_fb)
