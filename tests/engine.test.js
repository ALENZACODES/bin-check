import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { ITEMS } from "../src/data/items.js";
import { LABELS } from "../src/labels.js";
import { PROMPT_KEYS, DIM, EMBEDS_I8 } from "../src/data/label-embeds.js";
import { CHANGES, SOURCES } from "../src/rules2026.js";
import { BINS, buildIndex, search, resolve, editDistance, rankLabels, normalize, outcome, summarize, toCSV, confidenceWord, displayName } from "../src/engine.js";
import { matchEmbedding } from "../src/matcher.js";

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
const index = buildIndex(ITEMS);
const r = (id) => resolve(BY_ID.get(id));
const top = (q) => search(index, q, 3)[0];

test("the City data loads with 2,206 items, unique ids and known bins", () => {
  assert.equal(ITEMS.length, 2206);
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  for (const it of ITEMS) assert.ok(BINS[it.bin], `unknown bin ${it.bin} on ${it.id}`);
});

test("every 2026 rule and every photo label points at a real item", () => {
  for (const c of CHANGES) for (const id of c.ids) assert.ok(BY_ID.has(id), `${c.key}: ${id}`);
  for (const l of LABELS) assert.ok(BY_ID.has(l.item), `${l.key}: ${l.item}`);
  assert.equal(new Set(LABELS.map((l) => l.key)).size, LABELS.length);
  for (const c of CHANGES) assert.ok(SOURCES[c.source]?.url.startsWith("https://"));
});

test("an item is changed by at most one 2026 rule", () => {
  const seen = new Map();
  for (const c of CHANGES) for (const id of c.ids) { assert.ok(!seen.has(id), `${id} in ${seen.get(id)} and ${c.key}`); seen.set(id, c.key); }
});

test("coffee cups move from garbage to the Blue Bin in 2026", () => {
  const cup = r("A0870");
  assert.equal(cup.bin, "Blue Bin");
  assert.equal(cup.was, "Garbage Bin");
  assert.match(cup.steps.join(" "), /lid/i);
  assert.equal(cup.sources[0].url, SOURCES.cm.url);
  assert.equal(r("A0687").bin, "Garbage Bin", "compostable cups stay in the garbage");
});

test("alcohol containers go to deposit return, with the refund amounts", () => {
  const beer = r("A0013");
  assert.equal(beer.bin, "Deposit Return");
  assert.equal(beer.was, "Blue Bin");
  assert.match(beer.steps.join(" "), /10 cents.*20 cents/);
  assert.ok(beer.sources.some((s) => s.url === SOURCES.agco.url));
  assert.equal(r("A0215").bin, "Blue Bin", "a pop can is still recycling");
});

test("chip bags, wrappers, tubes, blister packs and foil are Blue Bin now", () => {
  for (const id of ["A0937", "A0649", "A1008", "A0705", "A0887", "A0605", "A0639", "A1405"]) assert.equal(r(id).bin, "Blue Bin", id);
});

test("books are not accepted in the 2026 Blue Bin", () => {
  assert.equal(r("A0019").bin, "Donate");
  assert.match(r("A0019").steps.join(" "), /library|charity/i);
});

test("stale 2023 advice about black plastic is removed and explained", () => {
  const shell = BY_ID.get("A0035");
  assert.match(shell.steps.join(" "), /black or compostable plastic in the Garbage Bin/);
  const out = r("A0035");
  assert.doesNotMatch(out.steps.join(" "), /black or compostable plastic in the Garbage Bin/);
  assert.ok(out.notes.some((n) => /Black plastic now goes in the Blue Bin/.test(n)));
  assert.equal(r("A0888").bin, "Blue Bin");
  assert.equal(r("A0629").bin, "Garbage Bin", "black garbage bags are still garbage");
});

test("black foam is left as garbage with an honest note", () => {
  const f = r("A1539");
  assert.equal(f.bin, "Garbage Bin");
  assert.ok(f.notes.some((n) => /Not settled/.test(n)));
});

test("glass and box notes come from the 2026 list", () => {
  assert.ok(r("A0084").notes.some((n) => /lid off/.test(n)));
  assert.ok(r("A0025").notes.some((n) => /60 by 60 cm/.test(n)));
  assert.ok(!r("A0205").notes.some((n) => /lid off/.test(n)), "plastic bottles keep their caps on");
});

test("search finds everyday words, plurals and synonyms", () => {
  assert.equal(top("coffee cup").bin, "Blue Bin");
  assert.equal(top("banana").name, "Banana");
  assert.equal(top("pizza box").id, "A0138");
  assert.equal(top("beer can").bin, "Deposit Return");
  assert.match(top("tinfoil").name, /foil/i);
  assert.match(top("k-cup").name, /coffee pod/i);
  assert.equal(top("tv").bin, "Electronic Waste");
  assert.equal(top("glass jars").id, "A0084");
});

test("search survives typos", () => {
  assert.equal(top("batterys").bin, "HHW");
  assert.equal(top("toothpaste tub").id, "A1008");
  assert.match(top("styrafoam takeout").name, /foam/i);
  assert.equal(top("bananna").id, "A0399");
});

test("search returns nothing for an empty or stop word query", () => {
  assert.deepEqual(search(index, ""), []);
  assert.deepEqual(search(index, "the of"), []);
});

test("edit distance counts a swap of two letters as one edit", () => {
  assert.equal(editDistance("cpu", "cup"), 1);
  assert.equal(editDistance("battery", "battery"), 0);
  assert.equal(editDistance("foam", "fome"), 2);
  assert.ok(editDistance("garbage", "recycling") > 2);
});

test("display names keep compound names whole", () => {
  assert.equal(displayName(BY_ID.get("A0070")), "Foam meat / fish / vegetable trays (non-black)");
  assert.equal(displayName(BY_ID.get("A0001")), "Aerosol cans (empty)");
});

test("label embeddings match the label list", () => {
  assert.equal(PROMPT_KEYS.length, LABELS.reduce((a, l) => a + l.prompts.length, 0));
  assert.equal(EMBEDS_I8.length, PROMPT_KEYS.length * DIM);
  assert.equal(DIM, 512);
});

test("label ranking keeps the best prompt per label and sums to 1", () => {
  const labels = [{ key: "a" }, { key: "a" }, { key: "b" }];
  const text = [normalize([1, 0]), normalize([0.6, 0.8]), normalize([0, 1])];
  const out = rankLabels(normalize([0.9, 0.1]), labels, text, 5);
  assert.equal(out.length, 2);
  assert.equal(out[0].key, "a");
  assert.ok(Math.abs(out.reduce((s, x) => s + x.p, 0) - 1) < 1e-9);
  assert.equal(confidenceWord(0.7), "high");
  assert.equal(confidenceWord(0.4), "medium");
  assert.equal(confidenceWord(0.1), "low");
});

test("the photo matcher gets real photos right (embeddings from MobileCLIP S0)", () => {
  const fx = JSON.parse(readFileSync(new URL("./fixtures/photo-embeds.json", import.meta.url)));
  const expect = { "coffee-cup": "coffee-cup", "chip-bag": "chip-bag", batteries: "battery", "banana-peel": "banana", "glass-jar": "glass-jar", "egg-carton": "egg-carton", "cfl-bulb": "cfl", clamshell: "clamshell", "foam-container": "foam-takeout", "water-bottle": "water-bottle", "drink-can": "pop-can" };
  let first = 0, inTop3 = 0;
  for (const [photo, key] of Object.entries(expect)) {
    const t = matchEmbedding(fx[photo], 3).map((x) => x.key);
    if (t[0] === key) first++;
    if (t.includes(key)) inTop3++;
  }
  assert.equal(inTop3, 11, "every photo has the right answer in the top three");
  assert.ok(first >= 9, `first guess right on ${first} of 11`);
});

test("guess outcomes measure contamination, landfill and hazards", () => {
  assert.equal(outcome("Blue Bin", "Blue Bin"), "right");
  assert.equal(outcome("Blue Bin", "Garbage Bin"), "contamination caught");
  assert.equal(outcome("Green Bin", "Blue Bin"), "contamination caught");
  assert.equal(outcome("Garbage Bin", "Blue Bin"), "landfill avoided");
  assert.equal(outcome("Garbage Bin", "HHW"), "hazard caught");
  assert.equal(outcome("Blue Bin", "Electronic Waste"), "hazard caught");
  assert.equal(outcome(null, "Blue Bin"), "looked up");
});

test("the log summary adds up", () => {
  const log = [
    { guess: "Garbage Bin", bin: "Blue Bin", grams: 12, changed: true },
    { guess: "Blue Bin", bin: "Garbage Bin", grams: 200 },
    { guess: "Blue Bin", bin: "Blue Bin", grams: 15 },
    { guess: "Garbage Bin", bin: "HHW", grams: 23 },
    { guess: null, bin: "Green Bin" },
  ];
  const s = summarize(log);
  assert.equal(s.items, 5);
  assert.equal(s.guessed, 4);
  assert.equal(s.right, 1);
  assert.equal(s.contamination, 1);
  assert.equal(s.landfill, 1);
  assert.equal(s.hazards, 1);
  assert.equal(s.gramsDiverted, 12);
  assert.equal(s.gramsCaught, 200);
  assert.equal(s.accuracy, 0.25);
  assert.equal(s.changed2026, 1);
});

test("the CSV export quotes commas and has a header", () => {
  const csv = toCSV([{ at: "2026-10-29T12:00:00Z", name: "Bottle, glass", guess: "Blue Bin", bin: "Blue Bin", grams: 250, changed: false }]);
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^time,item,your guess/);
  assert.match(lines[1], /"Bottle, glass"/);
});

test("the page cannot talk to other servers", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /connect-src 'self' blob: data:/);
  assert.doesNotMatch(csp, /https?:/);
  assert.doesNotMatch(csp, /'unsafe-eval'|'unsafe-inline'/);
  for (const f of readdirSync(new URL("../src/", import.meta.url)).filter((f) => f.endsWith(".js"))) {
    const src = readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /fetch\(\s*["'`]https?:/, f);
  }
});

test("at least 30 Waste Wizard answers are corrected by the 2026 rules", () => {
  const changed = ITEMS.filter((i) => r(i.id).was).length;
  assert.ok(changed >= 30, `${changed} changed`);
});
