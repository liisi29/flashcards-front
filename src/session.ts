import type { ISession } from "./types";

const KEY = "fc-session";

export function loadSession(): ISession {
  try {
    return (
      JSON.parse(localStorage.getItem(KEY) || "null") || {
        subjectId: "",
        topicId: "",
      }
    );
  } catch {
    return { subjectId: "", topicId: "" };
  }
}

export function saveSession(session: ISession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}
