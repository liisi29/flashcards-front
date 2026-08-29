/* Runtime groups: no stored membership. "Group N" is just cards
   [(N-1)*size .. N*size) of the current filtered deck. The chosen group
   size lives in localStorage (device preference); the group number the
   user last practised is remembered per (tagId, size) on the server so
   learning resumes in the same place across devices. */

import { api } from "./api";
import { currentUserId } from "./user";

export const GROUP_SIZES = [0, 10, 15, 20, 25] as const; // 0 = "—" / off
export type GroupSize = (typeof GROUP_SIZES)[number];

const SIZE_KEY = "learn-group-size";

export function getGroupSize(): GroupSize {
  try {
    const v = Number(localStorage.getItem(SIZE_KEY));
    return (GROUP_SIZES as readonly number[]).includes(v)
      ? (v as GroupSize)
      : 15;
  } catch {
    return 15;
  }
}

export function setGroupSize(size: GroupSize): void {
  try {
    localStorage.setItem(SIZE_KEY, String(size));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("learn-group-size-change"));
}

/** number of groups the deck splits into at this size */
export function groupCount(deckLength: number, size: GroupSize): number {
  if (!size) return 0;
  return Math.ceil(deckLength / size);
}

/** the deck sliced to one group (1-based); group 0 / size 0 = whole deck */
export function sliceGroup<T>(deck: T[], size: GroupSize, group: number): T[] {
  if (!size || !group) return deck;
  const start = (group - 1) * size;
  return deck.slice(start, start + size);
}

/** The canonical deck order groups are cut from when NOT shuffled: newest
    first (Mongo _id is time-monotonic). Both the Õpi deck and the Lisa
    "G1/G2" badge use this, so a card's group is the same in both. */
export function orderByNewest<T extends { _id: string }>(cards: T[]): T[] {
  return [...cards].sort((a, b) =>
    a._id < b._id ? 1 : a._id > b._id ? -1 : 0
  );
}

/** 1-based group number of a card at `index` in the ordered deck */
export function groupOfIndex(index: number, size: GroupSize): number {
  if (!size) return 0;
  return Math.floor(index / size) + 1;
}

// ── persisted "which group" per filter combination ──────────────────────
// Key = subject | sorted topics | sorted tags | size — so the resume
// position is stable for a given filter + group size.

export function posKey(
  subjectId: string,
  topicIds: string[],
  tagIds: string[],
  size: GroupSize
): string {
  return [
    subjectId,
    [...topicIds].sort().join(","),
    [...tagIds].sort().join(","),
    size,
  ].join("|");
}

/** remembered group number for this filter key, or 0 if none */
export async function loadGroupPos(key: string): Promise<number> {
  if (!key) return 0;
  try {
    const s = await api.getUserState(currentUserId());
    const v = s.learnPos?.[key];
    return typeof v === "number" ? v : 0;
  } catch {
    return 0;
  }
}

export function saveGroupPos(key: string, group: number): void {
  if (!key) return;
  api.setLearnPos(currentUserId(), key, group || null).catch(() => {});
}
