import type { ICard, Color, ISubject, ITag, IGroup, IUserState } from "./types";

const API = "https://flashcards-server-v3oq.onrender.com";

/* ── in-flight request tracking (for the "connecting…" spinner) ─────────── */
let _inFlight = 0;
export function apiInFlight() {
  return _inFlight;
}
function track<T>(p: Promise<T>): Promise<T> {
  _inFlight++;
  window.dispatchEvent(new Event("api-busy-change"));
  return p.finally(() => {
    _inFlight--;
    window.dispatchEvent(new Event("api-busy-change"));
  });
}

async function get<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await track(
    fetch(`${API}${path}${sep}_=${Date.now()}`, { cache: "no-store" })
  );
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await track(
    fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await track(
    fetch(`${API}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await track(
    fetch(`${API}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
  return res.json();
}

async function del(path: string): Promise<void> {
  await track(fetch(`${API}${path}`, { method: "DELETE" }));
}

async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await track(
    fetch(`${API}/upload`, { method: "POST", body: form })
  );
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
  bulkMoveCards: (opts: {
    cardIds: string[];
    subjectId: string;
    topicId: string;
    tagIds: string[];
  }) => patch<{ moved: number }>("/cards/bulk-move", opts),

  // Tags
  getTags: (subjectId?: string, topicId?: string) => {
    let path = "/tags";
    const params: string[] = [];
    if (subjectId) params.push(`subjectId=${encodeURIComponent(subjectId)}`);
    if (topicId) params.push(`topicId=${encodeURIComponent(topicId)}`);
    if (params.length) path += "?" + params.join("&");
    return get<ITag[]>(path);
  },
  createTag: (
    name: string,
    color: string,
    subjectId: string,
    topicId: string
  ) => post<ITag>("/tags", { name, color, subjectId, topicId }),
  updateTag: (id: string, name: string, color: string) =>
    put<ITag>(`/tags/${id}`, { name, color }),
  deleteTag: (id: string) => del(`/tags/${id}`),

  // Groups — auto-numbered per tag, materialized server-side once a tag
  // has more than 15 cards.
  /** groups for one tag (lazily created on the server if needed) */
  getGroupsForTag: (tagId: string) =>
    get<IGroup[]>(`/groups?tagId=${encodeURIComponent(tagId)}`),
  /** every already-materialized group under a subject/topic */
  getGroups: (opts: { subjectId?: string; topicId?: string }) => {
    const params: string[] = [];
    if (opts.subjectId)
      params.push(`subjectId=${encodeURIComponent(opts.subjectId)}`);
    if (opts.topicId)
      params.push(`topicId=${encodeURIComponent(opts.topicId)}`);
    return get<IGroup[]>(
      "/groups" + (params.length ? "?" + params.join("&") : "")
    );
  },
  /** move cards between existing groups; returns the tag's full group list */
  setGroupCards: (id: string, change: { add?: string[]; remove?: string[] }) =>
    patch<IGroup[]>(`/groups/${id}/cards`, change),

  // Per-user state (used for runtime-group resume position)
  getUserState: (user: string) =>
    get<IUserState>(`/userstate/${encodeURIComponent(user)}`),
  setLearnPos: (user: string, key: string, group: number | null) =>
    patch(`/userstate/${encodeURIComponent(user)}/learnpos`, { key, group }),

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
