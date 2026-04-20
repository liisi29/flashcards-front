import { createContext, useContext, useState } from "react";

interface ITagsContext {
  reloadKey: number;
  reload: () => void;
}

const TagsContext = createContext<ITagsContext>({ reloadKey: 0, reload: () => {} });

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <TagsContext.Provider value={{ reloadKey, reload: () => setReloadKey((k) => k + 1) }}>
      {children}
    </TagsContext.Provider>
  );
}

export function useTags() {
  return useContext(TagsContext);
}
