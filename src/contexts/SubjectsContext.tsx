import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ISubject } from "../types";
import { api } from "../api";

interface SubjectsContextValue {
  subjects: ISubject[];
  /** topics of every subject fetched so far (see ensureTopics) */
  allTopics: ISubject[];
  /** fetch one subject's topics if not cached yet. Topics are loaded per
      subject on demand — the current subject's automatically — instead of
      one request per subject on every page load. */
  ensureTopics: (_subjectId: string) => void;
  subjectLabel: (id: string) => string;
  topicLabel: (id?: string) => string;
  reload: () => void;
}

const SubjectsContext = createContext<SubjectsContextValue | null>(null);

export function SubjectsProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<
    Record<string, ISubject[]>
  >({});
  // subjects whose topics were requested — fetched or in flight
  const requested = useRef<Set<string>>(new Set());

  const fetchTopics = useCallback((subjectId: string) => {
    requested.current.add(subjectId);
    api
      .getTopics(subjectId)
      .then((topics) =>
        setTopicsBySubject((prev) => ({ ...prev, [subjectId]: topics }))
      )
      .catch(() => {
        // let a later ensureTopics retry
        requested.current.delete(subjectId);
      });
  }, []);

  const ensureTopics = useCallback(
    (subjectId: string) => {
      if (subjectId && !requested.current.has(subjectId))
        fetchTopics(subjectId);
    },
    [fetchTopics]
  );

  async function load() {
    try {
      setSubjects(await api.getSubjects());
    } catch {
      console.error("Failed to load subjects");
    }
    // refresh the topics already in use (e.g. after adding a topic)
    for (const sid of requested.current) fetchTopics(sid);
  }

  useEffect(() => {
    load();
  }, []);

  const allTopics = useMemo(
    () => Object.values(topicsBySubject).flat(),
    [topicsBySubject]
  );

  function subjectLabel(id: string) {
    return subjects.find((s) => s._id === id)?.label || id;
  }

  function topicLabel(id?: string) {
    if (!id) return "";
    return allTopics.find((t) => t._id === id)?.label || "";
  }

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        allTopics,
        ensureTopics,
        subjectLabel,
        topicLabel,
        reload: load,
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
}

export function useSubjects() {
  const ctx = useContext(SubjectsContext);
  if (!ctx) throw new Error("useSubjects must be used within SubjectsProvider");
  return ctx;
}
