// Embeds the sample photos with the same image model the browser uses and saves
// the vectors as a test fixture. Run from tools/: node embed-photos.mjs
import { env, AutoProcessor, CLIPVisionModelWithProjection, RawImage } from "@huggingface/transformers";
import { readdirSync, writeFileSync } from "node:fs";
import { matchEmbedding } from "../src/matcher.js";
env.localModelPath = new URL("../models/", import.meta.url).pathname;
env.allowRemoteModels = false;
const id = "Xenova/mobileclip_s0";
const proc = await AutoProcessor.from_pretrained(id);
const vis = await CLIPVisionModelWithProjection.from_pretrained(id, { dtype: "fp16" });
const dir = new URL("../docs/samples/", import.meta.url).pathname;
const fixture = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort()) {
  const img = await RawImage.read(dir + f);
  const { image_embeds } = await vis(await proc(img));
  const v = image_embeds.normalize().tolist()[0];
  fixture[f.replace(".jpg", "")] = v.map((x) => Math.round(x * 1e4) / 1e4);
  const top = matchEmbedding(v);
  console.log(f.padEnd(22), top.map((t) => `${t.key} ${(t.p * 100).toFixed(0)}%`).join("  "));
}
writeFileSync(new URL("../tests/fixtures/photo-embeds.json", import.meta.url), JSON.stringify(fixture));
