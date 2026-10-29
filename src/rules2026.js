// What changed on January 1, 2026, when Ontario's Blue Box moved to producer
// responsibility and Circular Materials took over Toronto's residential Blue Bin.
// The City's open data file is from November 2023, so these rules sit on top of it.
// Every rule names its source. Pages were opened on October 29, 2026.

export const SOURCES = {
  cm: { name: "Circular Materials, Toronto: what you can recycle", url: "https://www.circularmaterials.ca/resident-communities/toronto/" },
  cmNew: { name: "Circular Materials: new materials across Ontario in 2026", url: "https://www.circularmaterials.ca/news/ontario-new-materials/" },
  city: { name: "City of Toronto: Blue Bins no longer City run", url: "https://www.toronto.ca/news/blue-bins-no-longer-city-run-what-to-expect-january-1-2/" },
  odrp: { name: "LCBO: Ontario Deposit Return Program", url: "https://hellolcbo.com/app/answers/detail/a_id/193/" },
  agco: { name: "AGCO: grocery stores take back empties from January 1, 2026", url: "https://www.agco.ca/en/news/all-grocery-store-licensees-required-participate-ontario-deposit-return-program-january-1-2026" },
  ww: { name: "City of Toronto Waste Wizard open data (November 2023)", url: "https://open.toronto.ca/dataset/waste-wizard-lookup-table/" },
};

// Items whose bin changed. `ids` are Waste Wizard ids.
export const CHANGES = [
  {
    key: "cups", to: "Blue Bin", source: "cm",
    ids: ["A0711", "A0870", "A0983", "A0994", "A0800", "A2197"],
    why: "Paper hot and cold drink cups are accepted in the Blue Bin across Ontario from January 1, 2026.",
    steps: ["Empty the cup and shake it dry.", "Take the lid off. The cup and the lid both go in the Blue Bin, and so does the sleeve.", "Leave out compostable cups: they still go in the garbage."],
  },
  {
    key: "black", to: "Blue Bin", source: "cm",
    ids: ["A0630", "A0683", "A0888"],
    why: "Black plastic containers and lids are on the 2026 Blue Bin list.",
    steps: ["Empty it and rinse off any food.", "Put the lid back on and place it in the Blue Bin.", "Black plastic garbage bags are still garbage."],
  },
  {
    key: "tubes", to: "Blue Bin", source: "cm",
    ids: ["A1008", "A0705"],
    why: "Toothpaste tubes, deodorant and hand cream tubes are new to the Blue Bin in 2026.",
    steps: ["Squeeze it as empty as you can.", "Keep the cap on and place it in the Blue Bin."],
  },
  {
    key: "flexible", to: "Blue Bin", source: "cm",
    ids: ["A0937", "A0869", "A0649", "A0665", "A0787", "A0639", "A0681", "A0876", "A0890"],
    why: "Chip bags, snack wrappers, coffee bags, pet food bags, cereal liner bags and bubble wrap are flexible packaging, which the 2026 Blue Bin accepts.",
    steps: ["Empty it and shake out crumbs.", "Place it loose in the Blue Bin. Do not bag your recycling."],
  },
  {
    key: "blister", to: "Blue Bin", source: "cm",
    ids: ["A0631", "A0887", "A2129"],
    why: "Blister packs are listed as small plastic packaging in the 2026 Blue Bin.",
    steps: ["Make sure every pill or piece is out. Leftover medication goes back to a pharmacy.", "Place the empty pack in the Blue Bin."],
  },
  {
    key: "icecream", to: "Blue Bin", source: "cm",
    ids: ["A1405"],
    why: "Paper ice cream containers are paper laminate containers, which the 2026 Blue Bin accepts.",
    steps: ["Empty and scrape it clean.", "Take the lid off and place both in the Blue Bin."],
  },
  {
    key: "foil", to: "Blue Bin", source: "cm",
    ids: ["A0605", "A1005"],
    why: "Clean aluminum foil is on the 2026 Blue Bin list.",
    steps: ["Wipe off food.", "Ball it up so it is bigger than your fist, then place it in the Blue Bin."],
  },
  {
    key: "alcohol", to: "Deposit Return", source: "odrp",
    ids: ["A0013", "A0014", "A0251", "A0271"],
    why: "Alcohol containers are not accepted in the 2026 Blue Bin. They carry a deposit you can get back.",
    steps: ["Empty it.", "Return it to The Beer Store or any grocery store that sells alcohol. From January 1, 2026 every grocery store licensed to sell alcohol must take empties back.", "The refund is 10 cents for glass, plastic and cartons up to 630 mL and 20 cents above that. Cans are 10 cents up to 1 L and 20 cents above."],
    extraSource: "agco",
  },
  {
    key: "books", to: "Donate", source: "cm",
    ids: ["A0019", "A0093", "A0227", "A0228"],
    why: "Soft and hard cover books are not accepted in the 2026 Blue Bin.",
    steps: ["Give books in good shape to a Toronto Public Library book sale, a school, a little free library or a charity shop.", "Worn out books go in the garbage."],
  },
];

// Notes that apply to whole groups of Blue Bin items.
export const NOTES = [
  { test: (it) => ["A0757", "A1539", "A2205"].includes(it.id), text: "Not settled: the 2026 list accepts black plastic and foam trays and takeout containers, but it does not say whether black foam is accepted. Until it does, garbage is the safe choice.", source: "cm" },
  { test: (it) => it.bin === "Blue Bin" && /glass|jar|bottle/i.test(it.names.join(" ")) && !/plastic|metal|aluminum/i.test(it.names.join(" ")), text: "2026 rule: take the lid off glass jars and bottles. Metal lids go in the Blue Bin on their own.", source: "cm" },
  { test: (it) => it.bin === "Blue Bin" && /cardboard|box/i.test(it.names.join(" ")), text: "2026 rule: flatten boxes to no larger than 60 by 60 cm.", source: "cm" },
];

// Sentences in the 2023 instructions that the 2026 list makes wrong.
export const STALE = [
  /Place any black (or compostable )?plastic in the Garbage Bin\.?/gi,
  /Place any black or compostable plastic in the Garbage Bin\.?/gi,
];
export const STALE_REPLACEMENT = "Black plastic now goes in the Blue Bin too (2026). Compostable plastic is still garbage.";
