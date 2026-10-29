import { ITEMS } from "./data/items.js";
import { buildIndex, search, resolve, BINS, GUESS_CHOICES, outcome, summarize, toCSV, confidenceWord } from "./engine.js";
import { CHANGES, SOURCES } from "./rules2026.js";
import { matchEmbedding, LABELS } from "./matcher.js";
import { loadModel, embedImage } from "./vision.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const index = buildIndex(ITEMS);
const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
const LABEL_BY_ITEM = new Map(LABELS.map((l) => [l.item, l]));
const pill = (bin) => { const m = BINS[bin] || BINS["Garbage Bin"]; return `<span class="pill t-${m.tone}">${esc(m.short)}</span>`; };
const KEY = "bincheck.log.v1";
let log = [];
try { log = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { log = []; }
const saveLog = () => { try { localStorage.setItem(KEY, JSON.stringify(log)); } catch {} };

// ---------- search ----------
let current = null;
function showResults(q) {
  const box = $("#results");
  if (!q.trim()) { box.innerHTML = ""; return; }
  const hits = search(index, q, 6);
  box.innerHTML = hits.length ? hits.map((h) => `<li><button type="button" data-id="${h.id}"><span>${esc(h.name)}${h.was ? '<span class="new26">changed in 2026</span>' : ""}</span>${pill(h.bin)}</button></li>`).join("")
    : `<li class="note">Nothing matched. Try a simpler word, like "bag" or "box".</li>`;
}
$("#q").addEventListener("input", (e) => showResults(e.target.value));
$("#q").addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = $("#results button"); if (b) b.click(); } });
$("#results").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) openItem(b.dataset.id, "search"); });

// ---------- the answer card ----------
function openItem(id, via) {
  const r = resolve(BY_ID.get(id));
  current = { r, via, grams: LABEL_BY_ITEM.get(id)?.grams };
  $("#card").hidden = false;
  $("#cName").textContent = r.name;
  $("#verdict").textContent = ""; $("#verdict").className = "verdict";
  const guess = $("#guessMode").checked;
  $("#guessRow").hidden = !guess;
  $("#answer").hidden = guess;
  $("#guessBtns").innerHTML = GUESS_CHOICES.map((b) => `<button type="button" class="t-${BINS[b].tone}" data-guess="${b}">${esc(BINS[b].short)}</button>`).join("");
  renderAnswer(r);
  if (!guess) record(null);
  $("#card").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}
function renderAnswer(r) {
  const m = r.meta;
  $("#bin").innerHTML = `<span class="big t-${m.tone}">${esc(m.short)}</span><span class="what">${esc(m.what)}</span>`;
  const ch = $("#changed");
  ch.hidden = !r.was;
  if (r.was) ch.innerHTML = `<strong>Changed on January 1, 2026.</strong> The City's 2023 data says ${esc(BINS[r.was]?.short || r.was)}. ${esc(r.why)}`;
  $("#steps").innerHTML = r.steps.map((s) => `<li>${esc(s)}</li>`).join("");
  $("#notes").innerHTML = r.notes.map((n) => `<li>${esc(n)}</li>`).join("");
  $("#sources").innerHTML = "Sources: " + r.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join("");
}
const VERDICT = {
  right: ["right", "Right first time."],
  "contamination caught": ["caught", "Good catch. That would have contaminated the bin and could have sent a whole load to landfill."],
  "landfill avoided": ["saved", "That one can stay out of landfill."],
  "hazard caught": ["caught", "Important catch. This is hazardous or electronic and must not go in any curbside bin."],
  corrected: ["saved", "Not quite. Here is where it goes."],
};
$("#guessBtns").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-guess]"); if (!b || !current) return;
  const o = outcome(b.dataset.guess, current.r.bin);
  const [cls, text] = VERDICT[o];
  $("#verdict").className = "verdict " + cls; $("#verdict").textContent = text;
  $("#guessRow").hidden = true; $("#answer").hidden = false;
  record(b.dataset.guess);
});
$("#skipGuess").addEventListener("click", () => { $("#guessRow").hidden = true; $("#answer").hidden = false; record(null); });

function record(guess) {
  const r = current.r;
  log.unshift({ at: new Date().toISOString(), id: r.id, name: r.name, guess, bin: r.bin, grams: current.grams, changed: !!r.was, via: current.via });
  log = log.slice(0, 500);
  saveLog(); renderLog();
}

// ---------- the log ----------
function grams(g) { return g >= 1000 ? (g / 1000).toFixed(1) + " kg" : Math.round(g) + " g"; }
function renderLog() {
  const s = summarize(log);
  $("#sItems").textContent = s.items;
  $("#sRight").textContent = s.accuracy == null ? "none yet" : Math.round(s.accuracy * 100) + "%";
  $("#sCont").textContent = s.contamination + s.hazards;
  $("#sLand").textContent = grams(s.gramsDiverted);
  $("#logLine").textContent = s.guessed ? `${s.guessed} guesses. ${Math.round((s.contaminationRate || 0) * 100)}% would have put the wrong thing in a Blue or Green Bin, ${s.hazards} hazardous item${s.hazards === 1 ? "" : "s"} caught, ${s.changed2026} answer${s.changed2026 === 1 ? "" : "s"} changed by the 2026 rules.` : "";
  const cls = { right: "right", "contamination caught": "caught", "hazard caught": "caught", "landfill avoided": "saved", corrected: "saved", "looked up": "" };
  $("#logList").innerHTML = log.slice(0, 40).map((e) => { const o = outcome(e.guess, e.bin); return `<li><span>${esc(e.name)} ${pill(e.bin)}</span><span class="o ${cls[o]}">${esc(o)}</span></li>`; }).join("");
}
$("#csv").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([toCSV(log)], { type: "text/csv" }));
  a.download = "bin-check-log.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("#clearLog").addEventListener("click", () => { if (confirm("Clear your sorting log on this device?")) { log = []; saveLog(); renderLog(); } });
$("#demoLog").addEventListener("click", () => {
  // A made up week for one household, so the numbers can be seen working.
  const week = [["A0870", "Garbage Bin"], ["A0937", "Garbage Bin"], ["A0013", "Blue Bin"], ["A1616", "Garbage Bin"], ["A0211", "Garbage Bin"], ["A0399", "Green Bin"], ["A0025", "Blue Bin"], ["A1008", "Garbage Bin"], ["A0888", "Garbage Bin"], ["A1250", "Blue Bin"], ["A0812", "Blue Bin"], ["A1447", "Blue Bin"], ["A0109", "Blue Bin"], ["A0019", "Blue Bin"], ["A0821", "Garbage Bin"], ["A0205", "Blue Bin"], ["A0639", "Garbage Bin"], ["A1385", "Green Bin"], ["A1095", "Blue Bin"], ["A0605", "Garbage Bin"]];
  const t0 = Date.now() - 6 * 864e5;
  log = week.map(([id, guess], i) => { const r = resolve(BY_ID.get(id)); return { at: new Date(t0 + i * 7.2e6 * 4).toISOString(), id, name: r.name, guess, bin: r.bin, grams: LABEL_BY_ITEM.get(id)?.grams, changed: !!r.was, via: "sample" }; }).reverse();
  saveLog(); renderLog();
});

// ---------- photos ----------
const SAMPLES = ["coffee-cup", "chip-bag", "batteries", "foam-container", "banana-peel", "glass-jar", "egg-carton", "cfl-bulb", "clamshell", "water-bottle", "drink-can"];
$("#sampleStrip").innerHTML = SAMPLES.map((k) => `<button type="button" data-sample="${k}" aria-label="Sample photo: ${k.replace(/-/g, " ")}"><img src="docs/samples/${k}.jpg" alt="" loading="lazy"><span>${k.replace(/-/g, " ")}</span></button>`).join("");
$("#sampleStrip").addEventListener("click", (e) => { const b = e.target.closest("button[data-sample]"); if (!b) return; document.querySelectorAll(".strip button").forEach((x) => x.classList.toggle("on", x === b)); runPhoto(`docs/samples/${b.dataset.sample}.jpg`); });
$("#photo").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) runPhoto(URL.createObjectURL(f)); e.target.value = ""; });
const setState = (t) => { $("#modelState").textContent = t; $("#photoNote").textContent = t; };

async function runPhoto(src) {
  $("#photoBox").hidden = false; $("#photoImg").src = src;
  $("#photoTitle").textContent = "Looking at your photo"; $("#photoGuesses").innerHTML = "";
  $("#photoBox").scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const t = performance.now();
    const emb = await embedImage(src, setState);
    const top = matchEmbedding(emb, 3);
    const ms = Math.round(performance.now() - t);
    const c = confidenceWord(top[0].p);
    $("#photoTitle").textContent = c === "high" ? `Looks like: ${top[0].label}` : "Which one is it?";
    $("#photoNote").textContent = `${c === "high" ? "Confident." : c === "medium" ? "Fairly sure, please check." : "Not sure. Pick the right one, or search instead."} Worked out on this device in ${(ms / 1000).toFixed(1)} s.`;
    $("#photoGuesses").innerHTML = top.map((g) => { const r = resolve(BY_ID.get(g.item)); return `<li><button type="button" data-id="${g.item}"><span>${esc(g.label)} ${pill(r.bin)}${r.was ? '<span class="new26">changed in 2026</span>' : ""}</span><span class="conf">${Math.round(g.p * 100)}%</span><span class="bar"><i data-w="${Math.max(2, Math.round(g.p * 100))}"></i></span></button></li>`; }).join("");
    document.querySelectorAll("#photoGuesses i[data-w]").forEach((i) => { i.style.width = i.dataset.w + "%"; });
    document.body.dataset.photoDone = String(Date.now());
  } catch (err) {
    console.error(err);
    document.body.dataset.photoError = "1";
    $("#photoTitle").textContent = "The photo model could not start";
    $("#photoNote").textContent = "Your browser may be out of memory or too old. Search still works for every item.";
  }
}
$("#photoGuesses").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) openItem(b.dataset.id, "photo"); });

// ---------- 2026 changes ----------
const sample = (c) => resolve(BY_ID.get(c.ids[0]));
$("#changeList").innerHTML = CHANGES.map((c) => { const r = sample(c); return `<li><strong>${pill(c.to)} ${esc(r.name)}${c.ids.length > 1 ? ` and ${c.ids.length - 1} more` : ""}</strong><p>${esc(c.why)} <button type="button" data-id="${c.ids[0]}">See it</button> · <a href="${SOURCES[c.source].url}" target="_blank" rel="noopener">source</a></p></li>`; }).join("");
$("#changeList").addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) openItem(b.dataset.id, "changes"); });

renderLog();
const params = new URLSearchParams(location.search);
if (params.has("q")) { $("#q").value = params.get("q"); showResults($("#q").value); }
// Warm the model in the background on fast connections so the first photo is quick.
if (params.has("warm")) loadModel(setState).catch(() => {});
