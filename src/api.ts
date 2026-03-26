import type { Card, Color, Subject } from './types';

const API = 'https://flashcards-server-v3oq.onrender.com';

async function get<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${API}${path}${sep}_=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  await fetch(`${API}${path}`, { method: 'DELETE' });
}

async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API}/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  return data.url as string;
}

export const api = {
  // Cards
  getCards: (subjectId?: string, topicId?: string) => {
    let path = `/cards?all=1`;
    if (subjectId) path += `&subjectId=${encodeURIComponent(subjectId)}`;
    if (topicId) path += `&topicId=${encodeURIComponent(topicId)}`;
    return get<Card[]>(path);
  },

  addCard: (card: Omit<Card, '_id'>) => post<Card>('/cards/add', card),
  updateCard: (id: string, card: Partial<Card>) => put<Card>(`/cards/${id}`, card),
  setProgress: (id: string, name: string, color: Color) =>
    patch(`/cards/${id}/progress`, { name, color }),
  deleteCard: (id: string) => del(`/cards/${id}`),

  // Subjects
  getSubjects: () => get<Subject[]>('/subjects'),
  getTopics: (subjectId: string) =>
    get<Subject[]>(`/topics?subjectId=${encodeURIComponent(subjectId)}`),
  createSubject: (label: string, parentId?: string) =>
    post<Subject>('/subjects', { label, parentId: parentId || null }),
  updateSubject: (id: string, label: string) => put(`/subjects/${id}`, { label }),
  deleteSubject: (id: string) => del(`/subjects/${id}`),

  uploadPhoto,
};
