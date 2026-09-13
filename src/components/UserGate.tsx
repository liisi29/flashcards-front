import { useEffect, useState } from "react";
import styles from "./UserGate.module.css";
import { t } from "../strings";
import { USERS, getUserId, setUserId } from "../user";
import { useUser } from "../useUser";
import { api } from "../api";

function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return t.lastActiveNever;
  return new Date(iso).toLocaleDateString("et-EE");
}

/** Shows a one-time "who are you?" picker after the password gate.
    Once a user is chosen it just renders children; the header lets you
    switch later. */
export default function UserGate({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [picked, setPicked] = useState(() => getUserId() !== null);
  const [lastActive, setLastActive] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    if (user && picked) return;
    let alive = true;
    api
      .getAllUserStates()
      .then((states) => {
        if (!alive) return;
        const byId: Record<string, string | null> = {};
        for (const s of states) byId[s._id] = s.lastActive ?? null;
        setLastActive(byId);
      })
      .catch(() => {
        /* picker still works without the last-active hints */
      });
    return () => {
      alive = false;
    };
  }, [user, picked]);

  if (user && picked) return <>{children}</>;

  return (
    <div className={styles.overlay}>
      <div className={styles.box}>
        <h1>{t.appName}</h1>
        <p>{t.whoAreYou}</p>
        <div className={styles.users}>
          {USERS.map((u) => (
            <button
              key={u.id}
              className={styles.userBtn}
              onClick={() => {
                setUserId(u.id);
                setPicked(true);
              }}
            >
              <span className={styles.userLabel}>{u.label}</span>
              <span className={styles.userLastActive}>
                {formatLastActive(lastActive[u.id])}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
