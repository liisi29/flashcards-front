import type { ISession } from "./types";

const KEY = "fc-session";

export function loadSession(): ISession {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!saved) return { subjectId: "", topicId: "", topicIds: [] };
    return { topicIds: [], ...saved };
  } catch {
    return { subjectId: "", topicId: "", topicIds: [] };
  }
}

export function saveSession(session: ISession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}
