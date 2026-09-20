import type { Color } from "../types";
import { currentUserId } from "../user";

/** The card's difficulty for the current user, falling back to the legacy
    shared "all" value only when the user has never set their own — an
    explicit null (cleared back to grey) must stay null, not fall through
    to "all" just because null is nullish. */
export function cardColor(progress: Record<string, Color> | undefined): Color {
  if (!progress) return null;
  const uid = currentUserId();
  if (uid in progress) return progress[uid];
  return progress["all"] ?? null;
}
