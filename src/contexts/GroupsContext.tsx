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
  /** every group the context has loaded so far (materialized ones) */
  groups: IGroup[];
  /** groupId -> learnt (for the current user) */
  learnt: Record<string, boolean>;
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
  setLearnt: (_groupId: string, _value: boolean) => Promise<void>;
}

const GroupsContext = createContext<GroupsContextValue | null>(null);

function mergeByTag(prev: IGroup[], tagId: string, next: IGroup[]): IGroup[] {
  return prev.filter((g) => g.tagId !== tagId).concat(next);
}

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

  useEffect(() => {
    load();
  }, [load, user?.id]);

  const ensureTag = useCallback(async (tagId: string) => {
    const fresh = await api.getGroupsForTag(tagId);
    setGroups((prev) => mergeByTag(prev, tagId, fresh));
    return fresh;
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
        load();
      }
    },
    [load]
  );

  return (
    <GroupsContext.Provider
      value={{
        groups,
        learnt,
        reload: load,
        ensureTag,
        groupsForTag,
        groupOf,
        moveCard,
        setLearnt,
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
