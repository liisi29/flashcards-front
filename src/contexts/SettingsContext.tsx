import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { IUserSettings } from "../types";
import { api } from "../api";
import { currentUserId } from "../user";
import { getCardBgIds, setCardBgId } from "../cardBackgrounds";
import { getGroupSize, setGroupSize, type GroupSize } from "../runtimeGroups";

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

/** Effective settings: server values where present, otherwise the local
    device fallback (localStorage), otherwise the built-in default. */
export interface EffectiveSettings {
  cardBgS1: string;
  cardBgS2: string;
  groupSize: GroupSize;
  startSide: 1 | 2;
}

interface SettingsContextValue {
  settings: EffectiveSettings;
  /** true until the first server load resolves (or fails) */
  loading: boolean;
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
    groupSize: getGroupSize(),
    startSide: readStartSide(),
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
    case "groupSize":
      setGroupSize(value as GroupSize);
      break;
    case "startSide":
      writeStartSide(value as 1 | 2);
      break;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<EffectiveSettings>(localSnapshot);
  const [loading, setLoading] = useState(true);
  const [userTick, setUserTick] = useState(0);
  const loadedUser = useRef<string | null>(null);

  // keep in sync with local store change events (other tabs, direct writes)
  useEffect(() => {
    const sync = () => setSettings(localSnapshot());
    for (const ev of [
      "card-bg-change",
      "learn-group-size-change",
      "learn-start-side-change",
      "storage",
    ]) {
      window.addEventListener(ev, sync);
    }
    return () => {
      for (const ev of [
        "card-bg-change",
        "learn-group-size-change",
        "learn-start-side-change",
        "storage",
      ]) {
        window.removeEventListener(ev, sync);
      }
    };
  }, []);

  // load the server copy for the current user, then reconcile localStorage
  useEffect(() => {
    const uid = currentUserId();
    if (loadedUser.current === uid) return;
    loadedUser.current = uid;
    setLoading(true);
    let alive = true;
    api
      .getUserState(uid)

      .then((state) => {
        if (!alive) return;
        const s: IUserSettings = state.settings ?? {};
        // server wins; mirror into the local stores so existing readers
        // (card faces, learn deck) pick it up immediately
        if (s.cardBgS1) setCardBgId(1, s.cardBgS1);
        if (s.cardBgS2) setCardBgId(2, s.cardBgS2);
        if (typeof s.groupSize === "number")
          setGroupSize(s.groupSize as GroupSize);
        if (s.startSide === 1 || s.startSide === 2) writeStartSide(s.startSide);
        setSettings(localSnapshot());
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
      api.saveSettings(currentUserId(), { [key]: value }).catch(() => {
        /* stays applied locally; will re-sync on next load if it failed */
      });
    },
    []
  );

  return (
    <SettingsContext.Provider value={{ settings, loading, setSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
