import { useEffect, useRef, useState } from "react";
import { apiInFlight } from "../api";
import { t } from "../strings";
import styles from "./ServerSpinner.module.css";

/** Full-screen overlay shown while any API request is pending. It only
    appears after a short delay so fast calls don't flash it, and the
    "server is waking up" hint appears after a few more seconds. */
const SHOW_AFTER = 400; // ms a request must run before we show anything
const SLOW_AFTER = 3500; // ms before the "free server" hint appears

export function ServerSpinner() {
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const showTimer = useRef<number | undefined>(undefined);
  const slowTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const busy = apiInFlight() > 0;
      if (busy) {
        if (showTimer.current == null && !visible) {
          showTimer.current = window.setTimeout(() => {
            setVisible(true);
            slowTimer.current = window.setTimeout(
              () => setSlow(true),
              SLOW_AFTER
            );
          }, SHOW_AFTER);
        }
      } else {
        window.clearTimeout(showTimer.current);
        window.clearTimeout(slowTimer.current);
        showTimer.current = undefined;
        slowTimer.current = undefined;
        setVisible(false);
        setSlow(false);
      }
    };
    window.addEventListener("api-busy-change", update);
    update();
    return () => {
      window.removeEventListener("api-busy-change", update);
      window.clearTimeout(showTimer.current);
      window.clearTimeout(slowTimer.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <p className={styles.text}>{slow ? t.spinnerSlow : t.spinnerLoading}</p>
    </div>
  );
}
