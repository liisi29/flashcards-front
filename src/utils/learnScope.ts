/* The topics + tags picked on the Welcome page ("Mis me täna õpime?"),
   shared for this browser session with Õpi, Ülevaade and Lisa. Õpi also
   writes them when its own filters change (same keys, see LearnPage). */

export const TOPICS_KEY = "learn-topics";
export const TAGS_KEY = "learn-tags";

export function readScopeIds(key: string): string[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function writeScopeIds(key: string, ids: string[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}
