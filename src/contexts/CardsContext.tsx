import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import type { ICard } from "../types";
import { api } from "../api";

interface CardsContextValue {
  /** cards for a subject, or undefined if not fetched yet */
  cardsFor: (_subjectId: string) => ICard[] | undefined;
  /** ensure a subject's cards are loaded (no-op if already cached / loading) */
  ensureSubject: (_subjectId: string) => Promise<ICard[]>;
  /** force a re-fetch of one subject (after add / edit / delete / move) */
  reloadSubject: (_subjectId: string) => Promise<ICard[]>;
  /** drop the whole cache (e.g. after a cross-subject move) */
  clearAll: () => void;
  /** patch one cached card in place (optimistic updates) */
  patchCard: (_id: string, _patch: Partial<ICard>) => void;
  /** true while a subject fetch is in flight */
  isLoading: (_subjectId: string) => boolean;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [bySubject, setBySubject] = useState<Record<string, ICard[]>>({});
  const pending = useRef<Map<string, Promise<ICard[]>>>(new Map());

  const fetchSubject = useCallback((subjectId: string) => {
    const existing = pending.current.get(subjectId);
    if (existing) return existing;
    const p = api
      .getCards(subjectId)
      .then((cards) => {
        setBySubject((prev) => ({ ...prev, [subjectId]: cards }));
        return cards;
      })
      .finally(() => {
        pending.current.delete(subjectId);
      });
    pending.current.set(subjectId, p);
    return p;
  }, []);

  const cardsFor = useCallback(
    (subjectId: string) => bySubject[subjectId],
    [bySubject]
  );

  const ensureSubject = useCallback(
    (subjectId: string) => {
      if (!subjectId) return Promise.resolve([] as ICard[]);
      if (bySubject[subjectId]) return Promise.resolve(bySubject[subjectId]);
      return fetchSubject(subjectId);
    },
    [bySubject, fetchSubject]
  );

  const reloadSubject = useCallback(
    (subjectId: string) => {
      if (!subjectId) return Promise.resolve([] as ICard[]);
      pending.current.delete(subjectId);
      return fetchSubject(subjectId);
    },
    [fetchSubject]
  );

  const clearAll = useCallback(() => {
    pending.current.clear();
    setBySubject({});
  }, []);

  const patchCard = useCallback((id: string, patch: Partial<ICard>) => {
    setBySubject((prev) => {
      const next: Record<string, ICard[]> = {};
      for (const [sid, list] of Object.entries(prev)) {
        next[sid] = list.map((c) =>
          c._id === id ? { ...c, ...patch } : c
        );
      }
      return next;
    });
  }, []);

  const isLoading = useCallback(
    (subjectId: string) =>
      pending.current.has(subjectId) && !bySubject[subjectId],
    [bySubject]
  );

  return (
    <CardsContext.Provider
      value={{
        cardsFor,
        ensureSubject,
        reloadSubject,
        clearAll,
        patchCard,
        isLoading,
      }}
    >
      {children}
    </CardsContext.Provider>
  );
}

export function useCards() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}
