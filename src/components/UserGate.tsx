import { useState } from "react";
import styles from "./UserGate.module.css";
import { t } from "../strings";
import { USERS, getUserId, setUserId } from "../user";
import { useUser } from "../useUser";

/** Shows a one-time "who are you?" picker after the password gate.
    Once a user is chosen it just renders children; the header lets you
    switch later. */
export default function UserGate({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [picked, setPicked] = useState(() => getUserId() !== null);

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
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
