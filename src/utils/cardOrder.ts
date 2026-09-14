/** The canonical deck order: newest first (Mongo _id is time-monotonic).
    Used wherever a stable "newest first" ordering of cards is needed. */
export function orderByNewest<T extends { _id: string }>(cards: T[]): T[] {
  return [...cards].sort((a, b) =>
    a._id < b._id ? 1 : a._id > b._id ? -1 : 0
  );
}
