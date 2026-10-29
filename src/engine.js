// Bin Check engine: search, the 2026 overlay, the photo matcher maths and the
// sorting log. Pure functions, so the same code runs in the browser and in Node.
import { CHANGES, NOTES, STALE, STALE_REPLACEMENT, SOURCES } from "./rules2026.js";

export const BINS = {
  "Blue Bin": { short: "Blue Bin", what: "Recycling", tone: "blue", diverts: true },
  "Green Bin": { short: "Green Bin", what: "Organics", tone: "green", diverts: true },
  "Garbage Bin": { short: "Garbage", what: "Landfill", tone: "grey", diverts: false },
  "Yard Waste": { short: "Yard Waste", what: "Paper yard bags or an open bin", tone: "brown", diverts: true },
  HHW: { short: "Hazardous Waste", what: "Drop-Off Depot, Community Environment Day or Toxic Taxi", tone: "red", diverts: true, hazard: true },
  "Electronic Waste": { short: "E-waste", what: "Drop-Off Depot or Community Environment Day", tone: "purple", diverts: true, hazard: true },
  "Oversized Item": { short: "Oversized", what: "Curbside on your garbage day", tone: "grey", diverts: false },
  Metal: { short: "Metal pickup", what: "Curbside on your garbage day", tone: "teal", diverts: true },
  Depot: { short: "Drop-Off Depot", what: "Take it to a City Drop-Off Depot", tone: "grey", diverts: false },
  "Not Accepted": { short: "Not accepted", what: "The City does not collect this", tone: "red", diverts: false },
  "Christmas Tree": { short: "Tree pickup", what: "Curbside in January", tone: "green", diverts: true },
  "Deposit Return": { short: "Deposit return", what: "The Beer Store or a grocery store that sells alcohol", tone: "gold", diverts: true },
  Donate: { short: "Donate", what: "Reuse first, garbage if worn out", tone: "gold", diverts: true },
};
export const GUESS_CHOICES = ["Blue Bin", "Green Bin", "Garbage Bin", "HHW"];

const BY_ID = new Map(CHANGES.flatMap((c) => c.ids.map((id) => [id, c])));

// Apply the 2026 rules to one Waste Wizard item.
export function displayName(item) {
  const segs = item.names;
  const t = segs.length > 1 && segs.slice(1).some((x) => !x.includes(" ")) ? (item.title || segs.join("/")).replace(/\s*\/\s*/g, " / ") : segs[0];
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function resolve(item) {
  const change = BY_ID.get(item.id);
  const fixStale = (s) => STALE.reduce((t, re) => t.replace(re, "").trim(), s);
  let steps = item.steps.map(fixStale).filter(Boolean);
  const hadStale = item.steps.some((s) => STALE.some((re) => { re.lastIndex = 0; return re.test(s); }));
  const notes = [];
  const sources = [SOURCES.ww];
  if (change) {
    steps = change.steps.slice();
    sources.unshift(SOURCES[change.source]);
    if (change.extraSource) sources.splice(1, 0, SOURCES[change.extraSource]);
  }
  const bin = change ? change.to : item.bin;
  if (hadStale && !change) { notes.push(STALE_REPLACEMENT); if (!sources.includes(SOURCES.cm)) sources.unshift(SOURCES.cm); }
  for (const n of NOTES) if (n.test({ ...item, bin })) { notes.push(n.text); if (!sources.includes(SOURCES[n.source])) sources.unshift(SOURCES[n.source]); }
  return {
    id: item.id, name: displayName(item), aka: item.names.slice(1), bin, was: change ? item.bin : null,
    why: change ? change.why : null, steps, notes, sources, meta: BINS[bin] || BINS["Garbage Bin"],
  };
}

// ---------- search ----------
const SYN = {
  styrofoam: "foam", polystyrene: "foam", pop: "soda", soda: "pop", tinfoil: "foil", kcup: "coffee pod", "k-cup": "coffee pod",
  cellphone: "cell phone", phone: "cell phone", tv: "television", takeaway: "takeout", "take-out": "takeout", nappy: "diaper", nappies: "diapers",
  crisps: "chip", chips: "chip", bulb: "light bulb", lightbulb: "light bulb", cfl: "compact fluorescent", lid: "lid", tetra: "carton",
};
export const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[()]/g, " ").replace(/[^a-z0-9\- ]+/g, " ").replace(/\s+/g, " ").trim();
const stem = (w) => w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y" : w.length > 3 && /(ches|shes|xes|ses)$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
const STOP = new Set(["a", "an", "the", "of", "with", "and", "or", "for", "my", "old", "empty", "used", "e", "g", "eg"]);
const tokens = (s) => norm(s).split(" ").filter((w) => w && !STOP.has(w)).map(stem);

export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i), prev2 = null;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = cur[0];
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v); best = Math.min(best, v);
    }
    if (best > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}

export function buildIndex(items) {
  const rows = [];
  for (const it of items) {
    for (const name of it.names) rows.push({ it, name, n: norm(name), t: tokens(name) });
    if (it.names.length > 1) { const full = it.names.join(" "); rows.push({ it, name: it.names[0], n: norm(full), t: tokens(full), full: true }); }
  }
  const vocab = new Set(rows.flatMap((r) => r.t));
  return { rows, vocab: [...vocab] };
}

function expand(q) {
  const raw = norm(q);
  const words = raw.split(" ").map((w) => SYN[w] || w).join(" ");
  return { raw, toks: tokens(words) };
}

export function search(index, q, limit = 8) {
  const { raw, toks } = expand(q);
  if (!toks.length) return [];
  // Fix typos against the vocabulary: "styrafoam" -> "foam" via synonyms is handled above; "batterys" -> "battery".
  const fixed = toks.map((t) => {
    if (index.vocab.includes(t) || t.length < 4) return t;
    let best = t, bd = t.length >= 7 ? 2 : 1;
    for (const v of index.vocab) { const d = editDistance(t, v, bd); if (d <= bd && (d < bd || best === t)) { best = v; bd = d; if (d === 0) break; } }
    return best;
  });
  const scored = new Map();
  for (const r of index.rows) {
    let s = 0;
    if (r.n === raw) s = 1000;
    else if (r.n.startsWith(raw)) s = 700;
    const hit = fixed.filter((t) => r.t.some((w) => w === t || (t.length >= 3 && w.startsWith(t))));
    if (hit.length) {
      s = Math.max(s, 400 * (hit.length / fixed.length) + 100 * (hit.length / r.t.length));
      if (hit.length === fixed.length) s += 150;
    }
    if (!s) continue;
    if (r.full) s -= 60;
    s -= r.n.length * 0.4; // shorter, more general names first
    const prev = scored.get(r.it.id);
    if (!prev || prev.s < s) scored.set(r.it.id, { s, item: r.it, matched: r.name });
  }
  return [...scored.values()].sort((a, b) => b.s - a.s).slice(0, limit).map((x) => ({ ...resolve(x.item), matched: x.matched, score: Math.round(x.s) }));
}

// ---------- photo matching ----------
// Embeddings are unit length, so the dot product is the cosine similarity.
export function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
export function normalize(v) { const n = Math.hypot(...v) || 1; return Array.from(v, (x) => x / n); }

// labels: [{ key, label, item, grams }], textEmbeds: Float32Array rows. Returns top k with softmax confidence.
export function rankLabels(imageEmbed, labels, textEmbeds, k = 3, scale = 100) {
  const sims = labels.map((l, i) => ({ l, sim: dot(imageEmbed, textEmbeds[i]) }));
  // Several prompts can point at the same label key; keep the best per key.
  const best = new Map();
  for (const s of sims) if (!best.has(s.l.key) || best.get(s.l.key).sim < s.sim) best.set(s.l.key, s);
  const arr = [...best.values()];
  const m = Math.max(...arr.map((s) => s.sim));
  const exps = arr.map((s) => Math.exp((s.sim - m) * scale));
  const total = exps.reduce((a, b) => a + b, 0);
  return arr.map((s, i) => ({ ...s.l, sim: s.sim, p: exps[i] / total })).sort((a, b) => b.p - a.p).slice(0, k);
}

// How sure the matcher is, in words. Low confidence means ask the person to confirm.
export function confidenceWord(p) { return p >= 0.6 ? "high" : p >= 0.3 ? "medium" : "low"; }

// ---------- the sorting log ----------
const DEFAULT_GRAMS = 30;
export function outcome(guess, bin) {
  if (!guess) return "looked up";
  if (guess === bin) return "right";
  const meta = BINS[bin] || {};
  if (meta.hazard) return "hazard caught";
  if (guess === "Blue Bin" || guess === "Green Bin") return "contamination caught";
  if (guess === "Garbage Bin" && meta.diverts) return "landfill avoided";
  return "corrected";
}

export function summarize(log) {
  const s = { items: log.length, guessed: 0, right: 0, contamination: 0, landfill: 0, hazards: 0, gramsDiverted: 0, gramsCaught: 0, changed2026: 0, byBin: {} };
  for (const e of log) {
    const o = outcome(e.guess, e.bin);
    const g = e.grams || DEFAULT_GRAMS;
    if (e.guess) s.guessed++;
    if (o === "right") s.right++;
    if (o === "contamination caught") { s.contamination++; s.gramsCaught += g; }
    if (o === "landfill avoided") { s.landfill++; s.gramsDiverted += g; }
    if (o === "hazard caught") s.hazards++;
    if (e.changed) s.changed2026++;
    s.byBin[e.bin] = (s.byBin[e.bin] || 0) + 1;
  }
  s.accuracy = s.guessed ? s.right / s.guessed : null;
  // The share of guesses that would have put something wrong in a Blue or Green Bin.
  s.contaminationRate = s.guessed ? s.contamination / s.guessed : null;
  return s;
}

export function toCSV(log) {
  const esc = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  const rows = [["time", "item", "your guess", "right bin", "outcome", "grams (estimate)", "changed in 2026"]];
  for (const e of log) rows.push([e.at, e.name, e.guess || "", e.bin, outcome(e.guess, e.bin), e.grams || DEFAULT_GRAMS, e.changed ? "yes" : "no"]);
  return rows.map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}
