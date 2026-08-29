import { useState } from "react";
import styles from "./Collapsible.module.css";

/** A titled panel that can be folded away. The open/closed state is
    remembered per `storageKey` in localStorage so a section you close
    stays closed when you come back. */
export function Collapsible({
  title,
  storageKey,
  defaultOpen = true,
  children,
}: {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(`collapse:${storageKey}`);
      return v === null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  });

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`collapse:${storageKey}`, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className={`${styles.panel}${open ? "" : ` ${styles.closed}`}`}>
      <button className={styles.head} onClick={toggle} aria-expanded={open}>
        <span className={styles.caret} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        {title}
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </div>
  );
}
