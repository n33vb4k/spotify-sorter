/// <reference lib="webworker" />
/**
 * Runs the ONNX models off the main thread. Receives 16 kHz mono signals, returns tags.
 * Messages: {type:"init", base} -> {type:"ready", labels} | {type:"error"}
 *           {type:"tag", id, signal} -> {type:"tags", id, tags}
 */
import * as ort from "onnxruntime-web/wasm";
import { Tagger, MODEL_FILES, type OrtLike } from "./tagger";

let tagger: Tagger | null = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  try {
    if (msg.type === "init") {
      ort.env.wasm.wasmPaths = `${self.location.origin}/ort/`;
      ort.env.wasm.numThreads = 1; // threads need cross-origin isolation, which would block preview audio
      const base: string = msg.base;
      const meta = await (await fetch(`${base}/${MODEL_FILES.meta}`)).json();
      tagger = await Tagger.create(ort as unknown as OrtLike, async (f) => `${base}/${f}`, meta.classes, undefined, {
        executionProviders: ["wasm"],
      });
      self.postMessage({ type: "ready", labels: meta.classes.length });
    } else if (msg.type === "tag") {
      if (!tagger) throw new Error("Models not loaded");
      const tags = await tagger.tag(msg.signal as Float32Array);
      self.postMessage({ type: "tags", id: msg.id, tags });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: msg.id, message: (err as Error).message });
  }
};
