import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { CardTextSize, IUserSettings } from "../types";
import { api } from "../api";
import { currentUserId } from "../user";
import { getCardBgIds, setCardBgId } from "../cardBackgrounds";

const START_SIDE_KEY = "learn-start-side";

function readStartSide(): 1 | 2 {
  return localStorage.getItem(START_SIDE_KEY) === "2" ? 2 : 1;
}
function writeStartSide(s: 1 | 2) {
  try {
    localStorage.setItem(START_SIDE_KEY, String(s));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("learn-start-side-change"));
}

const TEXT_SIZE_KEY = "card-text-size";
// settings kept on this device only, not saved to the user on the server
const LOCAL_ONLY = new Set<keyof EffectiveSettings>(["cardTextSize"]);

/** Card text size steps → a multiplier on every card text font-size rule
    (CSS var --card-text-scale). Per device only (localStorage), never
    synced: a phone and a laptop usually want different sizes. Portrait auto-fit uses the scaled size as
    its starting point, so it still shrinks long words to fit. */
export const CARD_TEXT_SIZES: { id: CardTextSize; scale: number }[] = [
  { id: "xs", scale: 0.6 },
  { id: "s", scale: 0.8 },
  { id: "m", scale: 1 },
  { id: "l", scale: 1.2 },
  { id: "xl", scale: 1.4 },
];

function isTextSize(v: unknown): v is CardTextSize {
  return CARD_TEXT_SIZES.some((x) => x.id === v);
}
function readTextSize(): CardTextSize {
  try {
    const v = localStorage.getItem(TEXT_SIZE_KEY);
    return isTextSize(v) ? v : "m";
  } catch {
    return "m";
  }
}
function writeTextSize(s: CardTextSize) {
  try {
    localStorage.setItem(TEXT_SIZE_KEY, s);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("card-text-size-change"));
}

/** Effective settings: server values where present, otherwise the local
    device fallback (localStorage), otherwise the built-in default. */
export interface EffectiveSettings {
  cardBgS1: string;
  cardBgS2: string;
  startSide: 1 | 2;
  cardTextSize: CardTextSize;
}

interface SettingsContextValue {
  settings: EffectiveSettings;
  /** true until the first server load resolves (or fails) */
  loading: boolean;
  /** ISO timestamp of this user's previous visit (before this one), if known */
  lastActive: string | null;
  setSetting: <K extends keyof EffectiveSettings>(
    _key: K,
    _value: EffectiveSettings[K]
  ) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function localSnapshot(): EffectiveSettings {
  const bg = getCardBgIds();
  return {
    cardBgS1: bg.s1,
    cardBgS2: bg.s2,
    startSide: readStartSide(),
    cardTextSize: readTextSize(),
  };
}

/** Push a settings value into the matching local store so the rest of the
    app (which still reads those stores + their change events) updates. */
function applyLocally<K extends keyof EffectiveSettings>(
  key: K,
  value: EffectiveSettings[K]
) {
  switch (key) {
    case "cardBgS1":
      setCardBgId(1, value as string);
      break;
    case "cardBgS2":
      setCardBgId(2, value as string);
      break;
    case "startSide":
      writeStartSide(value as 1 | 2);
      break;
    case "cardTextSize":
      writeTextSize(value as CardTextSize);
      break;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<EffectiveSettings>(localSnapshot);
  const [loading, setLoading] = useState(true);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [userTick, setUserTick] = useState(0);
  const loadedUser = useRef<string | null>(null);

  // keep in sync with local store change events (other tabs, direct writes)
  useEffect(() => {
    const sync = () => setSettings(localSnapshot());
    const events = [
      "card-bg-change",
      "learn-start-side-change",
      "card-text-size-change",
      "storage",
    ];
    for (const ev of events) window.addEventListener(ev, sync);
    return () => {
      for (const ev of events) window.removeEventListener(ev, sync);
    };
  }, []);

  // card text size → the CSS var every card text rule multiplies by
  useEffect(() => {
    const scale =
      CARD_TEXT_SIZES.find((x) => x.id === settings.cardTextSize)?.scale ?? 1;
    document.documentElement.style.setProperty(
      "--card-text-scale",
      String(scale)
    );
  }, [settings.cardTextSize]);

  // load the server copy for the current user, then reconcile localStorage.
  // loadedUser is only marked once a load actually finishes (not when it
  // starts) so a StrictMode double-invoke's cleanup — which fires between
  // the two invocations, before the first fetch resolves — can't leave
  // `loading` stuck true by killing the run nothing else is doing.
  useEffect(() => {
    const uid = currentUserId();
    if (loadedUser.current === uid) return;
    setLoading(true);
    let alive = true;
    api
      .getUserState(uid)
      .then((state) => {
        if (!alive) return;
        loadedUser.current = uid;
        const s: IUserSettings = state.settings ?? {};
        // server wins; mirror into the local stores so existing readers
        // (card faces, learn deck) pick it up immediately
        if (s.cardBgS1) setCardBgId(1, s.cardBgS1);
        if (s.cardBgS2) setCardBgId(2, s.cardBgS2);
        if (s.startSide === 1 || s.startSide === 2) writeStartSide(s.startSide);
        setSettings(localSnapshot());
        // the previous visit's stamp, read before this visit overwrites it
        setLastActive(state.lastActive ?? null);
        api.touchLastActive(uid).catch(() => {
          /* best-effort — a missed stamp isn't worth surfacing */
        });
      })
      .catch(() => {
        /* offline / not signed in — keep the local snapshot */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userTick]);

  // re-run the loader when the user switches
  useEffect(() => {
    const onUser = () => {
      loadedUser.current = null;
      setSettings(localSnapshot());
      setLastActive(null);
      setUserTick((n) => n + 1);
    };
    window.addEventListener("fc-user-change", onUser);
    return () => window.removeEventListener("fc-user-change", onUser);
  }, []);

  const setSetting = useCallback(
    <K extends keyof EffectiveSettings>(
      key: K,
      value: EffectiveSettings[K]
    ) => {
      applyLocally(key, value); // instant, fires the local change event
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (LOCAL_ONLY.has(key)) return;
      api.saveSettings(currentUserId(), { [key]: value }).catch(() => {
        /* stays applied locally; will re-sync on next load if it failed */
      });
    },
    []
  );

  return (
    <SettingsContext.Provider
      value={{ settings, loading, lastActive, setSetting }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
