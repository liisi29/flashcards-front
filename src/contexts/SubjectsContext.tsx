import { createContext, useContext, useEffect, useState } from "react";
import type { ISubject } from "../types";
import { api } from "../api";

interface SubjectsContextValue {
  subjects: ISubject[];
  allTopics: ISubject[];
  subjectLabel: (id: string) => string;
  topicLabel: (id?: string) => string;
  reload: () => void;
}

const SubjectsContext = createContext<SubjectsContextValue | null>(null);

export function SubjectsProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [allTopics, setAllTopics] = useState<ISubject[]>([]);

  async function load() {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
      const topicLists = await Promise.all(
        data.map((s) => api.getTopics(s._id))
      );
      setAllTopics(topicLists.flat());
    } catch {
      console.error("Failed to load subjects");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function subjectLabel(id: string) {
    return subjects.find((s) => s._id === id)?.label || id;
  }

  function topicLabel(id?: string) {
    if (!id) return "";
    return allTopics.find((t) => t._id === id)?.label || "";
  }

  return (
    <SubjectsContext.Provider
      value={{ subjects, allTopics, subjectLabel, topicLabel, reload: load }}
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
