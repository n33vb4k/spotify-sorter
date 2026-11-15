// Copy the onnxruntime-web wasm runtime into public/ort so the browser can load it from our own origin.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("onnxruntime-web/ort-wasm-simd-threaded.wasm"));
const out = new URL("../public/ort/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
for (const f of ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) copyFileSync(join(dist, f), join(out, f));
console.log("copied onnxruntime-web runtime to public/ort");
