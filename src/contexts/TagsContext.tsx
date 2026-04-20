import { createContext, useContext, useEffect, useState } from "react";
import type { ITag } from "../types";
import { api } from "../api";

interface ITagsContext {
  tags: ITag[];
  reload: () => void;
}

const TagsContext = createContext<ITagsContext>({ tags: [], reload: () => {} });

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<ITag[]>([]);

  function load() {
    api.getTags().then(setTags).catch(() => {});
  }

  useEffect(() => { load(); }, []);

  return (
    <TagsContext.Provider value={{ tags, reload: load }}>
      {children}
    </TagsContext.Provider>
  );
}

export function useTags() {
  return useContext(TagsContext);
}
