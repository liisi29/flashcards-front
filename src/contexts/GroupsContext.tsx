import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { IGroup } from "../types";
import { api } from "../api";
import { currentUserId } from "../user";
import { useUser } from "../useUser";

interface GroupsContextValue {
  /** all groups across every tag (loaded once, refreshed on reload()) */
  groups: IGroup[];
  /** groupId -> learnt (for the current user) */
  learnt: Record<string, boolean>;
  reload: () => void;
  groupsForTag: (_tagId: string) => IGroup[];
  /** the group a card belongs to under a given tag, if any */
  groupOf: (_cardId: string, _tagId: string) => IGroup | undefined;
  setLearnt: (_groupId: string, _value: boolean) => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue | null>(null);

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [groups, setGroups] = useState<IGroup[]>([]);
  const [learnt, setLearntState] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    api
      .getGroups({})
      .then(setGroups)
      .catch(() => setGroups([]));
    api
      .getUserState(currentUserId())
      .then((s) => setLearntState(s.learntGroups || {}))
      .catch(() => setLearntState({}));
  }, []);

  // reload whenever the app mounts this or the user switches
  useEffect(() => {
    load();
  }, [load, user?.id]);

  const groupsForTag = useCallback(
    (tagId: string) =>
      groups.filter((g) => g.tagId === tagId).sort((a, b) => a.order - b.order),
    [groups]
  );

  const groupOf = useCallback(
    (cardId: string, tagId: string) =>
      groups.find((g) => g.tagId === tagId && g.cardIds.includes(cardId)),
    [groups]
  );

  const setLearnt = useCallback(
    async (groupId: string, value: boolean) => {
      setLearntState((prev) => {
        const next = { ...prev };
        if (value) next[groupId] = true;
        else delete next[groupId];
        return next;
      });
      try {
        await api.setGroupLearnt(currentUserId(), groupId, value);
      } catch {
        load(); // roll back from server
      }
    },
    [load]
  );

  return (
    <GroupsContext.Provider
      value={{ groups, learnt, reload: load, groupsForTag, groupOf, setLearnt }}
    >
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error("useGroups must be used within GroupsProvider");
  return ctx;
}
