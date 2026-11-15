import { SAMPLE_RATE } from "./mel";

let ctx: AudioContext | null = null;

/** Decode an MP3 and resample to 16 kHz mono with the browser's own resampler. */
export async function decodeTo16kMono(bytes: ArrayBuffer): Promise<Float32Array> {
  ctx ??= new AudioContext();
  const decoded = await ctx.decodeAudioData(bytes);
  const length = Math.ceil(decoded.duration * SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination); // multi-channel input is down-mixed to mono by the destination
  src.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}
