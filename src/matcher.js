// Turns an image embedding into the three most likely labels.
import { LABELS } from "./labels.js";
import { DIM, PROMPT_KEYS, EMBEDS_I8 } from "./data/label-embeds.js";
import { rankLabels, normalize } from "./engine.js";

const BY_KEY = new Map(LABELS.map((l) => [l.key, l]));
const PROMPT_LABELS = PROMPT_KEYS.map((k) => BY_KEY.get(k));
const TEXT = PROMPT_KEYS.map((_, i) => normalize(EMBEDS_I8.slice(i * DIM, (i + 1) * DIM)));

export function matchEmbedding(imageEmbed, k = 3) {
  return rankLabels(normalize(imageEmbed), PROMPT_LABELS, TEXT, k);
}
export { LABELS };
