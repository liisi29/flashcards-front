import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { IGroup } from "../types";
import { api } from "../api";
import { useUser } from "../useUser";

interface GroupsContextValue {
  /** every group the context has loaded so far (materialized ones) */
  groups: IGroup[];
  /** re-fetch everything from scratch */
  reload: () => void;
  /** ask the server to materialize + return this tag's groups, merge them in */
  ensureTag: (_tagId: string) => Promise<IGroup[]>;
  groupsForTag: (_tagId: string) => IGroup[];
  /** the group a card belongs to under a given tag, if any */
  groupOf: (_cardId: string, _tagId: string) => IGroup | undefined;
  /** move a card into a group (or out, if groupId is "") within a tag */
  moveCard: (
    _cardId: string,
    _tagId: string,
    _groupId: string
  ) => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue | null>(null);

function mergeByTag(prev: IGroup[], tagId: string, next: IGroup[]): IGroup[] {
  return prev.filter((g) => g.tagId !== tagId).concat(next);
}

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [groups, setGroups] = useState<IGroup[]>([]);
  // one in-flight ensureTag() per tag — the server materializes on this GET,
  // so firing two at once (e.g. LearnSubBar + GroupManager) could race
  const pending = useRef<Map<string, Promise<IGroup[]>>>(new Map());

  const load = useCallback(() => {
    api
      .getGroups({})
      .then(setGroups)
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    load();
  }, [load, user?.id]);

  const ensureTag = useCallback((tagId: string) => {
    const existing = pending.current.get(tagId);
    if (existing) return existing;
    const p = api
      .getGroupsForTag(tagId)
      .then((fresh) => {
        setGroups((prev) => mergeByTag(prev, tagId, fresh));
        return fresh;
      })
      .finally(() => {
        pending.current.delete(tagId);
      });
    pending.current.set(tagId, p);
    return p;
  }, []);

  const groupsForTag = useCallback(
    (tagId: string) =>
      groups
        .filter((g) => g.tagId === tagId)
        .sort((a, b) => a.number - b.number),
    [groups]
  );

  const groupOf = useCallback(
    (cardId: string, tagId: string) =>
      groups.find((g) => g.tagId === tagId && g.cardIds.includes(cardId)),
    [groups]
  );

  const moveCard = useCallback(
    async (cardId: string, tagId: string, groupId: string) => {
      const current = groups.find(
        (g) => g.tagId === tagId && g.cardIds.includes(cardId)
      );
      if (current?._id === groupId) return;
      try {
        if (current && !groupId) {
          const next = await api.setGroupCards(current._id, {
            remove: [cardId],
          });
          setGroups((prev) => mergeByTag(prev, tagId, next));
        } else if (groupId) {
          const next = await api.setGroupCards(groupId, { add: [cardId] });
          setGroups((prev) => mergeByTag(prev, tagId, next));
        }
      } catch {
        ensureTag(tagId); // resync
      }
    },
    [groups, ensureTag]
  );

  return (
    <GroupsContext.Provider
      value={{
        groups,
        reload: load,
        ensureTag,
        groupsForTag,
        groupOf,
        moveCard,
      }}
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
