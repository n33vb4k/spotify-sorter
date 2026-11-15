import { MelExtractor, N_MELS, PATCH_SIZE, toPatches } from "./mel";

/** Minimal slice of the onnxruntime API shared by onnxruntime-web and onnxruntime-node. */
export interface OrtLike {
  InferenceSession: { create(model: string | Uint8Array, options?: object): Promise<SessionLike> };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => TensorLike;
}
interface TensorLike {
  data: unknown;
  dims: readonly number[];
}
interface SessionLike {
  inputNames: readonly string[];
  run(feeds: Record<string, TensorLike>): Promise<Record<string, TensorLike>>;
}

export const MOODS = ["relaxed", "aggressive", "happy", "danceable"] as const;
export type Mood = (typeof MOODS)[number];

export const MODEL_FILES = {
  effnet: "discogs-effnet-bsdynamic-1.onnx",
  meta: "discogs-effnet-bsdynamic-1.json",
  relaxed: "mood_relaxed-discogs-effnet-1.onnx",
  aggressive: "mood_aggressive-discogs-effnet-1.onnx",
  happy: "mood_happy-discogs-effnet-1.onnx",
  danceable: "danceability-discogs-effnet-1.onnx",
} as const;

/** Index of the positive class in each 2-class head (from the models' metadata JSON). */
const POSITIVE: Record<Mood, number> = { relaxed: 1, aggressive: 0, happy: 0, danceable: 0 };

export interface Tags {
  /** Top Discogs styles, e.g. ["Electronic---UK Garage", 0.81]. */
  styles: [string, number][];
  moods: Partial<Record<Mood, number>>;
}

type Loader = (file: string) => Promise<string | Uint8Array>;

function mean(data: Float32Array, rows: number, cols: number): Float32Array {
  const out = new Float32Array(cols);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out[c] += data[r * cols + c] / rows;
  return out;
}

export class Tagger {
  private mel = new MelExtractor();
  private constructor(
    private ort: OrtLike,
    private effnet: SessionLike,
    private heads: Partial<Record<Mood, SessionLike>>,
    readonly labels: string[],
  ) {}

  /** `load(file)` returns a URL (browser) or bytes (node). Mood heads that fail to load are skipped. */
  static async create(ort: OrtLike, load: Loader, labels: string[], moods: readonly Mood[] = MOODS, options?: object) {
    const effnet = await ort.InferenceSession.create(await load(MODEL_FILES.effnet), options);
    const heads: Partial<Record<Mood, SessionLike>> = {};
    await Promise.all(
      moods.map(async (m) => {
        try {
          heads[m] = await ort.InferenceSession.create(await load(MODEL_FILES[m]), options);
        } catch {
          /* optional */
        }
      }),
    );
    return new Tagger(ort, effnet, heads, labels);
  }

  /** Raw outputs for a 16 kHz mono signal, or null if it's shorter than one patch (~2 s). */
  async run(signal: Float32Array) {
    const { data, count } = toPatches(this.mel.spectrogram(signal));
    if (!count) return null;
    const out = await this.effnet.run({
      [this.effnet.inputNames[0]]: new this.ort.Tensor("float32", data, [count, PATCH_SIZE, N_MELS]),
    });
    const act = out.activations.data as Float32Array;
    const emb = out.embeddings;
    const moods: Partial<Record<Mood, number>> = {};
    for (const [m, head] of Object.entries(this.heads) as [Mood, SessionLike][]) {
      const r = await head.run({ [head.inputNames[0]]: emb });
      const t = Object.values(r)[0];
      moods[m] = mean(t.data as Float32Array, t.dims[0], t.dims[1])[POSITIVE[m]];
    }
    return { activations: mean(act, count, this.labels.length), moods, patches: count };
  }

  async tag(signal: Float32Array, topK = 5): Promise<Tags | null> {
    const r = await this.run(signal);
    if (!r) return null;
    const order = Array.from(r.activations.keys()).sort((a, b) => r.activations[b] - r.activations[a]);
    return {
      styles: order.slice(0, topK).map((i) => [this.labels[i], Math.round(r.activations[i] * 1000) / 1000]),
      moods: Object.fromEntries(Object.entries(r.moods).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
    };
  }
}
