import type { ICard, Color, ISubject } from "./types";

const API = "https://flashcards-server-v3oq.onrender.com";

async function get<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${sep}_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  await fetch(`${API}${path}`, { method: "DELETE" });
}

async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

export const api = {
  // Cards
  getCards: (subjectId?: string, topicId?: string) => {
    let path = `/cards?all=1`;
    if (subjectId) path += `&subjectId=${encodeURIComponent(subjectId)}`;
    if (topicId) path += `&topicId=${encodeURIComponent(topicId)}`;
    return get<ICard[]>(path);
  },

  getCardsByTopics: async (
    subjectId: string,
    topicIds: string[]
  ): Promise<ICard[]> => {
    if (topicIds.length === 0) {
      return api.getCards(subjectId || undefined);
    }
    const results = await Promise.all(
      topicIds.map((id) => api.getCards(subjectId, id))
    );
    const seen = new Set<string>();
    const merged: ICard[] = [];
    for (const cards of results) {
      for (const card of cards) {
        if (!seen.has(card._id)) {
          seen.add(card._id);
          merged.push(card);
        }
      }
    }
    return merged;
  },

  addCard: (card: Omit<ICard, "_id">) => post<ICard>("/cards/add", card),
  updateCard: (id: string, card: Partial<ICard>) =>
    put<ICard>(`/cards/${id}`, card),
  setProgress: (id: string, name: string, color: Color) =>
    patch(`/cards/${id}/progress`, { name, color }),
  deleteCard: (id: string) => del(`/cards/${id}`),

  // Subjects
  getSubjects: () => get<ISubject[]>("/subjects"),
  getTopics: (subjectId: string) =>
    get<ISubject[]>(`/topics?subjectId=${encodeURIComponent(subjectId)}`),
  createSubject: (label: string, parentId?: string) =>
    post<ISubject>("/subjects", { label, parentId: parentId || null }),
  updateSubject: (id: string, label: string) =>
    put(`/subjects/${id}`, { label }),
  deleteSubject: (id: string) => del(`/subjects/${id}`),

  uploadPhoto,
};
