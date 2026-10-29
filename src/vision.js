// Loads MobileCLIP S0 from this site's own files and embeds a photo, all in the
// browser. Nothing is fetched from any other server.
let ready = null;
export function loadModel(onState = () => {}) {
  if (ready) return ready;
  ready = (async () => {
    onState("Loading the photo model (about 37 MB, once)...");
    const T = await import("./vendor/transformers.min.js");
    T.env.allowRemoteModels = false;
    T.env.allowLocalModels = true;
    T.env.localModelPath = new URL("../models/", import.meta.url).href;
    T.env.useBrowserCache = false;
    T.env.useWasmCache = false;
    const w = T.env.backends.onnx.wasm;
    w.numThreads = 1;
    w.proxy = false;
    w.wasmPaths = { mjs: new URL("./vendor/ort-wasm-simd-threaded.mjs", import.meta.url).href, wasm: new URL("./vendor/ort-wasm-simd-threaded.wasm", import.meta.url).href };
    const id = "Xenova/mobileclip_s0";
    const [proc, model] = await Promise.all([
      T.AutoProcessor.from_pretrained(id),
      T.CLIPVisionModelWithProjection.from_pretrained(id, { dtype: "fp16", device: "wasm" }),
    ]);
    onState("Photo model ready. It runs on this device.");
    return { T, proc, model };
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

export async function embedImage(src, onState) {
  const { T, proc, model } = await loadModel(onState);
  const img = await T.RawImage.read(src);
  const { image_embeds } = await model(await proc(img));
  return Array.from(image_embeds.normalize().data);
}
