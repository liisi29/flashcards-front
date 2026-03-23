import type { Session } from './types';

const KEY = 'fc-session';

export function loadSession(): Session {
  try {
    return (
      JSON.parse(localStorage.getItem(KEY) || 'null') || {
        name: '',
        subjectId: '',
        topicId: '',
        viewers: [],
      }
    );
  } catch {
    return { name: '', subjectId: '', topicId: '', viewers: [] };
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}
