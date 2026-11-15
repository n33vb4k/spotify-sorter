/**
 * TypeScript port of Essentia's TensorflowInputMusiCNN feature extractor.
 * Mirrors ml/mel_reference.py, which is verified against Essentia (max error ~1e-5).
 */

export const SAMPLE_RATE = 16000;
export const N_FFT = 512;
export const HOP = 256;
export const N_MELS = 96;
export const N_BINS = N_FFT / 2 + 1;
export const PATCH_SIZE = 128;
export const PATCH_HOP = 62;
const F_MAX = 8000;

// Slaney mel scale: linear below 1 kHz, logarithmic above.
const LOG_STEP = Math.log(6.4) / 27;
export const hzToMel = (f: number) => (f < 1000 ? f / (200 / 3) : 15 + Math.log(Math.max(f, 1e-12) / 1000) / LOG_STEP);
export const melToHz = (m: number) => (m < 15 ? m * (200 / 3) : 1000 * Math.exp(LOG_STEP * (m - 15)));

/** 96 x 257 triangular filters, each normalised to unit area ("unit_tri"). Row-major. */
export function melFilterbank(): Float64Array[] {
  const lo = hzToMel(0);
  const hi = hzToMel(F_MAX);
  const edges = Array.from({ length: N_MELS + 2 }, (_, i) => melToHz(lo + ((hi - lo) * i) / (N_MELS + 1)));
  const binHz = SAMPLE_RATE / 2 / (N_BINS - 1);
  return Array.from({ length: N_MELS }, (_, i) => {
    const [a, b, c] = [edges[i], edges[i + 1], edges[i + 2]];
    const row = new Float64Array(N_BINS);
    const scale = 2 / (c - a);
    for (let k = 0; k < N_BINS; k++) {
      const f = k * binHz;
      const w = Math.min((f - a) / (b - a), (c - f) / (c - b));
      if (w > 0) row[k] = w * scale;
    }
    return row;
  });
}

/** Symmetric Hann window, not normalised (Essentia `normalized=false`). */
export function hann(n = N_FFT): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

/** In-place iterative radix-2 FFT on (re, im) of length 512. */
function fft(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar;
        im[i + k + len / 2] = im[i + k] - ai;
        re[i + k] += ar;
        im[i + k] += ai;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

export class MelExtractor {
  private fb = melFilterbank();
  private win = hann();
  private re = new Float64Array(N_FFT);
  private im = new Float64Array(N_FFT);
  private power = new Float64Array(N_BINS);

  /** log10(10000 * mel_power + 1) for one 512-sample frame. */
  bands(frame: ArrayLike<number>, out = new Float32Array(N_MELS)): Float32Array {
    const { re, im, win, power, fb } = this;
    for (let i = 0; i < N_FFT; i++) {
      re[i] = frame[i] * win[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < N_BINS; k++) power[k] = re[k] * re[k] + im[k] * im[k];
    for (let m = 0; m < N_MELS; m++) {
      const row = fb[m];
      let s = 0;
      for (let k = 0; k < N_BINS; k++) s += row[k] * power[k];
      out[m] = Math.log10(s * 10000 + 1);
    }
    return out;
  }

  /**
   * Whole signal -> mel spectrogram [frames x 96].
   * Essentia FrameCutter defaults: first frame centred on sample 0 (256 zeros prepended), partial tail dropped.
   */
  spectrogram(signal: Float32Array): Float32Array[] {
    const padded = new Float32Array(signal.length + N_FFT / 2);
    padded.set(signal, N_FFT / 2);
    const frames: Float32Array[] = [];
    for (let i = 0; i + N_FFT <= padded.length; i += HOP) frames.push(this.bands(padded.subarray(i, i + N_FFT)));
    return frames;
  }
}

/** EffNet input: flattened [patches x 128 x 96], 128-frame patches every 62 frames, partial tail dropped. */
export function toPatches(mel: Float32Array[]): { data: Float32Array; count: number } {
  const count = mel.length >= PATCH_SIZE ? Math.floor((mel.length - PATCH_SIZE) / PATCH_HOP) + 1 : 0;
  const data = new Float32Array(count * PATCH_SIZE * N_MELS);
  for (let p = 0; p < count; p++)
    for (let f = 0; f < PATCH_SIZE; f++) data.set(mel[p * PATCH_HOP + f], (p * PATCH_SIZE + f) * N_MELS);
  return { data, count };
}
