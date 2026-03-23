import type { Session } from './types';

const KEY = 'fc-session';

export function loadSession(): Session {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null') || { name: '', subject: '', viewers: [] };
  } catch {
    return { name: '', subject: '', viewers: [] };
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}
