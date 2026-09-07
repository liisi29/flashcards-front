/* ── Pimekiri (touch-typing) — keyboard data ──
   Two physical layouts. They only differ where it matters for this drill:
   the home row and its neighbours. The rows below are what the on-screen
   keyboard draws; `stages` is the progressive set of keys the falling
   ball is allowed to use, home-row outward (f j → df jk → sdf jkl → …). */

export type LayoutId = "us" | "et";

export interface KeyboardLayout {
  id: LayoutId;
  label: string;
  /** on-screen keyboard, top row → bottom row (space bar drawn separately) */
  rows: string[][];
  /** finger colour bands — index positions are the same in both layouts */
  homeRow: string[];
}

/* US QWERTY */
const US: KeyboardLayout = {
  id: "us",
  label: "US",
  rows: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ],
  homeRow: ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
};

/* Estonian QWERTY — same alnum block, Estonian letters sit to the right
   of the home/upper rows (ö õ on the home row, ä ü on the upper row). */
const ET: KeyboardLayout = {
  id: "et",
  label: "Eesti",
  rows: [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "ü", "õ"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä"],
    ["z", "x", "c", "v", "b", "n", "m", ",", ".", "-"],
  ],
  homeRow: ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ö", "ä"],
};

export const LAYOUTS: Record<LayoutId, KeyboardLayout> = { us: US, et: ET };
export const LAYOUT_LIST: KeyboardLayout[] = [ET, US];

/* Progressive stages. Each stage adds one more key per hand, working
   outward from the index fingers. The last stage of each layout tacks on
   that layout's extra letters so the drill covers the whole home row. */
const COMMON_STAGES: string[][] = [
  ["f", "j"],
  ["d", "f", "j", "k"],
  ["s", "d", "f", "j", "k", "l"],
  ["a", "s", "d", "f", "j", "k", "l", ";"],
];

export function stagesFor(id: LayoutId): string[][] {
  if (id === "et") {
    return [
      ["f", "j"],
      ["d", "f", "j", "k"],
      ["s", "d", "f", "j", "k", "l"],
      ["a", "s", "d", "f", "j", "k", "l", "ö"],
      ["a", "s", "d", "f", "j", "k", "l", "ö", "ä"],
    ];
  }
  return COMMON_STAGES;
}

/** keys always shown highlighted on the on-screen keyboard for a stage */
export function activeKeys(id: LayoutId, stageIdx: number): Set<string> {
  const stages = stagesFor(id);
  const s = stages[Math.min(stageIdx, stages.length - 1)];
  return new Set(s);
}
