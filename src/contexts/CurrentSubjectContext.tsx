import { createContext, useContext, useState } from "react";

interface CurrentSubjectValue {
  /** the one subject every view is scoped to; "" = none picked */
  subjectId: string;
  setSubjectId: (_id: string) => void;
}

const CurrentSubjectContext = createContext<CurrentSubjectValue | null>(null);

/** One selected subject, chosen in the header, used everywhere. In-memory
    only — a hard reload starts with nothing picked. */
export function CurrentSubjectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [subjectId, setSubjectId] = useState("");
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
