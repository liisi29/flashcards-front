import { useEffect, useRef, useState } from "react";
import { apiInFlight } from "../api";
import { t } from "../strings";
import styles from "./ServerSpinner.module.css";

/** Full-screen overlay shown while any API request is pending. It only
    appears after a short delay so fast calls don't flash it. While visible
    it cycles the fun "server" messages; if it stays slow, it swaps to the
    "free server, may take a minute" explanation. */
const SHOW_AFTER = 400; // ms a request must run before we show anything
const SLOW_AFTER = 6000; // ms visible before the "free server" hint takes over
const ROTATE_EVERY = 2200; // ms between fun messages

function randomMsg() {
  return t.loaderMsgs[Math.floor(Math.random() * t.loaderMsgs.length)];
}

export function ServerSpinner() {
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const [msg, setMsg] = useState(randomMsg);
  const showTimer = useRef<number | undefined>(undefined);
  const slowTimer = useRef<number | undefined>(undefined);
  const rotateTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const clearAll = () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(slowTimer.current);
      window.clearInterval(rotateTimer.current);
      showTimer.current = undefined;
      slowTimer.current = undefined;
      rotateTimer.current = undefined;
    };

    const update = () => {
      const busy = apiInFlight() > 0;
      if (busy) {
        if (showTimer.current == null && !visible) {
          showTimer.current = window.setTimeout(() => {
            setMsg(randomMsg());
            setVisible(true);
            rotateTimer.current = window.setInterval(
              () => setMsg(randomMsg()),
              ROTATE_EVERY
            );
            slowTimer.current = window.setTimeout(
              () => setSlow(true),
              SLOW_AFTER
            );
          }, SHOW_AFTER);
        }
      } else {
        clearAll();
        setVisible(false);
        setSlow(false);
      }
    };

    window.addEventListener("api-busy-change", update);
    update();
    return () => {
      window.removeEventListener("api-busy-change", update);
      clearAll();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.spinner} />
      <p className={styles.text}>{slow ? t.spinnerSlow : msg}</p>
    </div>
  );
}
