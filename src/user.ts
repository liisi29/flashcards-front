/* Who is using the app right now. No auth — a fixed list of known people,
   the choice kept in localStorage. The `id` is the stable key used for
   per-user card difficulty and (later) per-user group progress; `label`
   is just what's shown, so a person can be renamed without losing data. */

export interface User {
  id: string;
  label: string;
}

export const USERS: User[] = [
  { id: "liisi", label: "Liisi" },
  { id: "hele", label: "Hele" },
  { id: "saara", label: "Saara" },
  { id: "tahti", label: "Tähti" },
  { id: "martti", label: "Martti" },
  { id: "kadri", label: "Kadri" },
  { id: "madis-r", label: "Madis R" },
  { id: "madis-p", label: "Madis P" },
];

const KEY = "fc-user";

export function getUserId(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && USERS.some((u) => u.id === v) ? v : null;
  } catch {
    return null;
  }
}

export function getUser(): User | null {
  const id = getUserId();
  return id ? (USERS.find((u) => u.id === id) ?? null) : null;
}

export function setUserId(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("fc-user-change"));
}

export function clearUser(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("fc-user-change"));
}

/** Non-reactive accessor for code outside React. Falls back to "all" (the
    legacy shared key) so nothing breaks before a user is picked. */
export function currentUserId(): string {
  return getUserId() ?? "all";
}
