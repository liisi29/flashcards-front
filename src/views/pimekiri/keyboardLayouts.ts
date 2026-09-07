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

/* Progressive stages. Each stage adds ONE more key per hand, starting on
   the index fingers of the home row and working outward, then up to the
   top row, then down to the bottom row — until the whole keyboard is in
   play. Ordered as [left-hand key, right-hand key] pairs; a stage's key
   set is every pair up to and including it, flattened. */
const KEY_PAIRS: Record<LayoutId, [string, string][]> = {
  us: [
    // home row: index anchors, inner index reach, then middle → pinky
    ["f", "j"],
    ["g", "h"],
    ["d", "k"],
    ["s", "l"],
    ["a", ";"],
    // top row, index → pinky (index does r+t / u+y)
    ["r", "u"],
    ["t", "y"],
    ["e", "i"],
    ["w", "o"],
    ["q", "p"],
    // bottom row, index → pinky
    ["v", "m"],
    ["b", "n"],
    ["c", ","],
    ["x", "."],
    ["z", "/"],
  ],
  et: [
    // home row, index → pinky (right side runs a s d f | j k l ö ä)
    ["f", "j"],
    ["g", "h"],
    ["d", "k"],
    ["s", "l"],
    ["a", "ö"],
    ["", "ä"], // one more key on the right pinky, nothing further left
    // top row, index → pinky (right side ... u i o p ü õ)
    ["r", "u"],
    ["t", "y"],
    ["e", "i"],
    ["w", "o"],
    ["q", "p"],
    ["", "ü"],
    ["", "õ"],
    // bottom row, index → pinky
    ["v", "m"],
    ["b", "n"],
    ["c", ","],
    ["x", "."],
    ["z", "-"],
  ],
};

const STAGES: Record<LayoutId, string[][]> = {
  us: buildStages("us"),
  et: buildStages("et"),
};

function buildStages(id: LayoutId): string[][] {
  const out: string[][] = [];
  const acc: string[] = [];
  for (const [l, r] of KEY_PAIRS[id]) {
    for (const k of [l, r]) if (k && !acc.includes(k)) acc.push(k);
    out.push([...acc]);
  }
  return out;
}

export function stagesFor(id: LayoutId): string[][] {
  return STAGES[id];
}

/** How many successful catches to spend on a stage before unlocking the
    next one. Fast at the start (just f/j — 3 catches), ramping up as the
    key set grows, then a steady cost once the rows are wide. */
const STAGE_CATCHES = [3, 3, 5, 7, 9, 11, 12, 13, 14, 15];

export function catchesForStage(stageIdx: number): number {
  return STAGE_CATCHES[Math.min(stageIdx, STAGE_CATCHES.length - 1)];
}

/** Given the running catch total, which stage should be active. */
export function stageForCatches(id: LayoutId, totalCatches: number): number {
  const maxStage = stagesFor(id).length - 1;
  let stage = 0;
  let spent = 0;
  while (stage < maxStage && totalCatches >= spent + catchesForStage(stage)) {
    spent += catchesForStage(stage);
    stage += 1;
  }
  return stage;
}

/** The catch total that puts you exactly at the start of `stageIdx` — used
    to resume a run partway up the ladder without replaying earlier stages. */
export function catchesToReachStage(id: LayoutId, stageIdx: number): number {
  const maxStage = stagesFor(id).length - 1;
  const target = Math.max(0, Math.min(stageIdx, maxStage));
  let sum = 0;
  for (let s = 0; s < target; s++) sum += catchesForStage(s);
  return sum;
}

/** Highest stage index available for a layout. */
export function maxStageFor(id: LayoutId): number {
  return stagesFor(id).length - 1;
}

/** Progress toward the next stage, from the running catch total.
    `have` / `need` catches within the current stage; `atMax` once the
    whole ladder is cleared. */
export function stageProgress(
  id: LayoutId,
  totalCatches: number
): { stage: number; have: number; need: number; atMax: boolean } {
  const stage = stageForCatches(id, totalCatches);
  const atMax = stage >= maxStageFor(id);
  const base = catchesToReachStage(id, stage);
  const need = catchesForStage(stage);
  const have = Math.max(0, Math.min(need, totalCatches - base));
  return { stage, have, need, atMax };
}

/** keys always shown highlighted on the on-screen keyboard for a stage */
export function activeKeys(id: LayoutId, stageIdx: number): Set<string> {
  const stages = stagesFor(id);
  const s = stages[Math.min(stageIdx, stages.length - 1)];
  return new Set(s);
}
