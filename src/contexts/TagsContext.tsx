import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ITag } from "../types";
import { api } from "../api";

interface ITagsContext {
  /** all tags for a subject, or undefined if not fetched yet */
  tagsFor: (_subjectId: string) => ITag[] | undefined;
  /** tags for one topic within a subject (from the cache) */
  tagsForTopic: (_subjectId: string, _topicId: string) => ITag[];
  /** ensure a subject's tags are loaded (no-op if cached / in flight) */
  ensureSubject: (_subjectId: string) => Promise<ITag[]>;
  /** force a re-fetch of one subject's tags (after create / rename / delete) */
  reloadSubject: (_subjectId: string) => Promise<ITag[]>;
  /** legacy: bump so any component keyed on it re-derives */
  reloadKey: number;
  /** re-fetch every cached subject + bump reloadKey */
  reload: () => void;
}

const TagsContext = createContext<ITagsContext | null>(null);

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [bySubject, setBySubject] = useState<Record<string, ITag[]>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const pending = useRef<Map<string, Promise<ITag[]>>>(new Map());

  const fetchSubject = useCallback((subjectId: string) => {
    const existing = pending.current.get(subjectId);
    if (existing) return existing;
    const p = api
      .getTags(subjectId)
      .then((tags) => {
        setBySubject((prev) => ({ ...prev, [subjectId]: tags }));
        return tags;
      })
      .finally(() => {
        pending.current.delete(subjectId);
      });
    pending.current.set(subjectId, p);
    return p;
  }, []);

  const tagsFor = useCallback(
    (subjectId: string) => bySubject[subjectId],
    [bySubject]
  );

  const tagsForTopic = useCallback(
    (subjectId: string, topicId: string) =>
      (bySubject[subjectId] ?? []).filter((t) => t.topicId === topicId),
    [bySubject]
  );

  const ensureSubject = useCallback(
    (subjectId: string) => {
      if (!subjectId) return Promise.resolve([] as ITag[]);
      if (bySubject[subjectId]) return Promise.resolve(bySubject[subjectId]);
      return fetchSubject(subjectId);
    },
    [bySubject, fetchSubject]
  );

  const reloadSubject = useCallback(
    (subjectId: string) => {
      if (!subjectId) return Promise.resolve([] as ITag[]);
      pending.current.delete(subjectId);
      return fetchSubject(subjectId);
    },
    [fetchSubject]
  );

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
    const loaded = Object.keys(bySubject);
    pending.current.clear();
    for (const sid of loaded) fetchSubject(sid);
  }, [bySubject, fetchSubject]);

  return (
    <TagsContext.Provider
      value={{
        tagsFor,
        tagsForTopic,
        ensureSubject,
        reloadSubject,
        reloadKey,
        reload,
      }}
    >
      {children}
    </TagsContext.Provider>
  );
}

export function useTags() {
  const ctx = useContext(TagsContext);
  if (!ctx) throw new Error("useTags must be used within TagsProvider");
  return ctx;
}
