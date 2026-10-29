# Devpost submission: Bin Check (Arbiter Hacks V1, Theme Track: Rethinking Waste)

Paste each block into the matching field. Fill [YOUTUBE_URL] once the video is up. The live and repo links are filled in.

**Track**: Theme Track, Rethinking Waste (choose it when registering; one track only)

**Project name**
Bin Check

**Elevator pitch** (200 characters max)
Which Toronto bin? Type it or snap a photo. City data for 2,206 items, corrected for the 2026 Blue Bin rules, with an image model that runs on your phone. Guess first, and it logs what you caught.

**Built with**
javascript, html5, css3, transformers.js, onnx-runtime-web, mobileclip, webassembly, node.js, playwright, github-pages, toronto-open-data

**Try it out links**
* https://alenzacodes.github.io/bin-check/
* https://github.com/ALENZACODES/bin-check

**Video demo link**
[YOUTUBE_URL]

**Image gallery** (in this order; all are in docs/)
1. gallery-5-photo.png: "A photo sorted on device in about a second: chip bags are Blue Bin since January 2026"
2. gallery-3-answer.png: "Guess first, then the answer, what changed in 2026 and the source"
3. gallery-4-deposit.png: "Beer bottles left the Blue Bin. Bin Check catches the mistake and shows the deposit refund"
4. gallery-6-log.png: "The sorting log measures mistakes caught and grams kept out of landfill"
5. gallery-7-changes.png: "145 answers in the City's 2023 data corrected with the 2026 list"
6. gallery-8-phone.png: "On a phone: batteries are hazardous waste, never curbside"
7. gallery-2-search.png: "Search 2,206 Toronto items, typos and everyday words welcome"
8. gallery-1-start.png: "On device: the page cannot send your photos anywhere"

---

## About the project (story field)

## Inspiration
In Toronto, 35% of what goes in the Blue Bin does not belong there. That is one of the highest contamination rates in Ontario, and it is not because people don't care. It is because the question at the bin is hard: is a coffee cup recycling? A chip bag? A pizza box with grease on it?

Then on January 1, 2026 the answers changed. Ontario's Blue Box moved to producer responsibility, Circular Materials took over Toronto's residential Blue Bin, and the accepted list grew. Coffee cups, chip bags, black plastic, toothpaste tubes, blister packs and foil became recycling. Beer and wine containers left it. The City's open data file, the one any app would read, is still from November 2023.

## What it does
Bin Check answers one question, which bin, in a few seconds.

* **Search** the City of Toronto's own Waste Wizard data, 2,206 items, with typo tolerance and everyday words (styrofoam, pop, tinfoil, K-Cup).
* **The 2026 rules on top.** Bin Check corrects 145 of the old answers: 34 items change bin and 111 lose outdated advice about black plastic. Every changed answer says what changed and links the source. Where the new list is silent, as with black foam, it keeps the safe answer and says so.
* **Take a photo.** A small image model, MobileCLIP S0, runs in the browser and matches the photo against 81 common items in about a second. It shows its top three guesses with how sure it is, and you confirm. The photo never leaves the phone.
* **Guess first.** Before the answer, you say where you would have put it. Right, contamination caught, landfill avoided or hazard caught: every lookup becomes a measurement.
* **A sorting log** on your device: accuracy, Blue and Green Bin mistakes caught, hazards caught and a rough count of grams kept out of landfill, with a CSV download.
* **Deposit return** for alcohol containers, with the 10 and 20 cent refunds, and clear steps for hazardous waste and electronics.

## How I built it
Plain JavaScript modules, HTML and CSS. No framework, no server, no build step, hosted free on GitHub Pages.

* **Data**: a builder turns the City's Waste Wizard JSON into a module, and `rules2026.js` holds every 2026 change with its new bin, steps and source.
* **Search**: normalising, plural stemming, synonyms, and typo repair with a Damerau Levenshtein distance against the item vocabulary.
* **On device vision**: MobileCLIP S0 through Transformers.js and ONNX Runtime Web, all loaded from the site's own files. Text embeddings for 153 prompts are computed ahead of time and stored as int8, so the browser only runs the 23 MB image model.
* **A network lock**: a Content Security Policy blocks every request to any other server. The browser check tries to send data out and confirms it fails.
* **Tests**: 23 Node tests, including the photo matcher on 11 real photos (all 11 right in the top three, 9 right first), plus a headless Chrome check that runs the real model.

## Challenges I ran into
The quantized versions of the image model loaded fine and returned nonsense: every photo looked like a sponge. Comparing them with the full precision model showed the int8 export was broken for this architecture, so I switched to the fp16 image model, which matches full precision, and kept int8 only for the stored text vectors, where it makes no difference to the ranking.

The 2023 data was harder than it looked. Over a hundred Blue Bin items carry a sentence saying black plastic goes in the garbage, which is now wrong, so the overlay rewrites instructions as well as bins. And some answers are genuinely unsettled under the new list, so the honest answer is to say so.

## Accomplishments that I'm proud of
It is current. Anything built straight on the City's open data gives 2023 answers in 2026, and Bin Check fixes 145 of them with a source on each. And it measures itself: the guess first log turns "I think it helps" into numbers.

## What I learned
Sorting is a knowledge problem more than a motivation problem. People get the obvious items right and the changed ones wrong, which is exactly where a tool can help. Small image models are now good enough to run on a phone for this, as long as the app admits when it isn't sure.

## What's next for Bin Check
* French, and the other most spoken languages in Toronto
* a building mode for apartment superintendents, with a printable sorting sheet
* a pilot with a residents' association to measure contamination before and after
* more photo labels, trained on real Toronto bin photos

## The waste problem and how I'd measure it (Theme Track paragraph)
The problem is Blue Bin contamination in Toronto, 35% of what residents put in, which raises processing costs and can send whole loads to landfill, made worse by the January 2026 change to what is accepted. Bin Check targets the moment of decision at the bin and measures itself as it goes: each lookup records the person's own guess and the right answer, so the log gives a household's mistake rate directly. Success would be the share of wrong Blue and Green Bin guesses falling over a month of use for the same people, fewer yellow "oops" stickers on their bins, and fewer hazardous items guessed as garbage. In a pilot with a building or a street, I would compare a short bin audit before and after four weeks against a similar group without the app.

---

## Submission form answers

**Team**: John Khan (solo), Toronto, Ontario
**Track**: Theme Track, Rethinking Waste
**Built during the event**: yes, from scratch on October 29, 2026. The hackathon runs October 20 to December 21, 2026. The navy and red page theme is reused from my earlier projects.
**Open source libraries**: Transformers.js (Apache 2.0), ONNX Runtime Web (MIT), MobileCLIP S0 weights (Apple licence). Playwright only for the browser check and demo recording.

## Before submitting (checklist for John)
1. Done October 29: the repo is public and GitHub Pages is on.
2. Open the live link, tap a sample photo and check it answers in a second or two.
3. Upload docs/demo-captioned.mp4 to YouTube as Public or Unlisted (2:14; the limit is 2 to 3 minutes), or record a voice-over with VIDEO_SCRIPT.md.
4. Replace [YOUTUBE_URL] above.
5. Upload the eight gallery images in order.
