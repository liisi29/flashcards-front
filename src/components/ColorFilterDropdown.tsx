import { useEffect, useRef, useState } from "react";
import { t } from "../strings";
import type { Color } from "../types";
import styles from "./ColorFilterDropdown.module.css";

const ALL_COLORS: Color[] = [null, "red", "yellow", "green"];
const COLOR_LABELS: Record<string, string> = {
  null: t.colorNull,
  red: t.colorRed,
  yellow: t.colorYellow,
  green: t.colorGreen,
};
const COLOR_DOT: Record<string, string> = {
  null: "#718096",
  red: "#fc8181",
  yellow: "#f6e05e",
  green: "#68d391",
};

interface Props {
  activeColors: Color[];
  onToggleColor: (_c: Color) => void;
}

/** The "Raskusaste" trigger + checkbox dropdown used to filter cards by
    traffic-light color — shared between the real õpi bar and the public
    share page so both look and behave the same. */
export function ColorFilterDropdown({ activeColors, onToggleColor }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className={styles.colorDropdown} ref={ref}>
      <button
        className={styles.colorDropdownTrigger}
        onClick={() => setOpen((o) => !o)}
      >
        Raskusaste
        <span className={styles.colorDots}>
          {ALL_COLORS.filter((c) => !!c).map((c) => (
            <span
              key={String(c)}
              className={styles.colorDotSmall}
              style={{ background: COLOR_DOT[String(c)] }}
            />
          ))}
        </span>
        <span className={styles.dropdownCaret}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className={styles.colorDropdownMenu}>
          {ALL_COLORS.map((c) => (
            <label key={String(c)} className={styles.colorDropdownItem}>
              <input
                type="checkbox"
                checked={activeColors.includes(c)}
                onChange={() => onToggleColor(c)}
              />
              <span
                className={styles.colorDotSmall}
                style={{ background: COLOR_DOT[String(c)] }}
              />
              {COLOR_LABELS[String(c)]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
