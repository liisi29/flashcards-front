import { createContext, useContext, useState } from "react";

interface CurrentSubjectValue {
  /** the one subject every view is scoped to; "" = none picked */
  subjectId: string;
  setSubjectId: (_id: string) => void;
}

const CurrentSubjectContext = createContext<CurrentSubjectValue | null>(null);

const KEY = "current-subject";

function read(): string {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

/** One selected subject, chosen in the header, used everywhere. Kept in
    sessionStorage so a reload doesn't lose it; a fresh tab starts empty. */
export function CurrentSubjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [subjectId, setSubjectIdState] = useState(read);

  function setSubjectId(id: string) {
    setSubjectIdState(id);
    try {
      if (id) sessionStorage.setItem(KEY, id);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <CurrentSubjectContext.Provider value={{ subjectId, setSubjectId }}>
      {children}
    </CurrentSubjectContext.Provider>
  );
}

export function useCurrentSubject() {
  const ctx = useContext(CurrentSubjectContext);
  if (!ctx)
    throw new Error(
      "useCurrentSubject must be used within CurrentSubjectProvider"
    );
  return ctx;
}
