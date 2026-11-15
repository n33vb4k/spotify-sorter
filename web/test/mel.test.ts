import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as ortNode from "onnxruntime-node";
import { MelExtractor, melFilterbank, toPatches } from "../src/lib/audio/mel";
import { Tagger, type OrtLike } from "../src/lib/audio/tagger";

const fx = JSON.parse(readFileSync(join(__dirname, "fixtures/pipeline.json"), "utf8"));
const signal = new Float32Array(new Uint8Array(Buffer.from(fx.signalF32Base64, "base64")).buffer);
const MODELS = join(__dirname, "../../ml/models");

describe("mel features (port of Essentia TensorflowInputMusiCNN)", () => {
  it("filterbank matches the reference", () => {
    const sums = melFilterbank().map((r) => r.reduce((a, b) => a + b, 0));
    sums.forEach((s, i) => expect(s).toBeCloseTo(fx.filterbankRowSums[i], 9));
  });

  const mel = new MelExtractor().spectrogram(signal);
  it("frame count matches", () => expect(mel.length).toBe(fx.numFrames));
  it("mel frames match within 1e-4", () => {
    for (const [i, ref] of Object.entries(fx.melFrames) as [string, number[]][]) {
      const err = Math.max(...ref.map((v, k) => Math.abs(v - mel[Number(i)][k])));
      expect(err, `frame ${i}`).toBeLessThan(1e-4);
    }
  });
  it("patch count matches", () => expect(toPatches(mel).count).toBe(fx.numPatches));
});

describe.skipIf(!existsSync(join(MODELS, "discogs-effnet-bsdynamic-1.onnx")))("ONNX tagger (needs web/scripts/fetch-models.sh ml/models)", () => {
  it("reproduces reference activations and mood", async () => {
    const labels = JSON.parse(readFileSync(join(MODELS, "discogs-effnet-bsdynamic-1.json"), "utf8")).classes;
    const tagger = await Tagger.create(ortNode as unknown as OrtLike, async (f) => readFileSync(join(MODELS, f)), labels, ["relaxed"]);
    const out = (await tagger.run(signal))!;
    const err = Math.max(...fx.activationsMean.map((v: number, i: number) => Math.abs(v - out.activations[i])));
    expect(err).toBeLessThan(1e-3);
    expect(out.moods.relaxed).toBeCloseTo(fx.relaxedMean[1], 3);
  }, 60_000);
});
