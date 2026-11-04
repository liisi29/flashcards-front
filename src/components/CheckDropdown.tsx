import { useEffect, useRef, useState } from "react";
import styles from "./CheckDropdown.module.css";

export interface CheckOption {
  id: string;
  label: string;
  /** colour dot in front (tags) */
  color?: string;
  /** small grey text on the right (e.g. a tag's topic) */
  hint?: string;
}

/** A dropdown that looks like a <select> but holds a checkbox list —
    pick any number of options. Closes on a click outside. */
export function CheckDropdown({
  label,
  options,
  selected,
  onToggle,
  placeholder,
  empty,
}: {
  label: string;
  options: CheckOption[];
  selected: string[];
  onToggle: (_id: string) => void;
  /** trigger text while nothing is picked */
  placeholder: string;
  /** text in the open list when there are no options */
  empty?: string;
}) {
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

  const picked = options.filter((o) => selected.includes(o.id));
  const summary =
    picked.length === 0
      ? placeholder
      : picked.length <= 2
        ? picked.map((o) => o.label).join(", ")
        : `${picked[0].label} +${picked.length - 1}`;

  return (
    <div className={styles.wrap} ref={ref}>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={`${styles.trigger}${picked.length ? "" : ` ${styles.placeholder}`}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.summary}>{summary}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden>
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
      </button>
      {open && (
        <div className={styles.menu}>
          {options.length === 0 && empty && (
            <span className={styles.empty}>{empty}</span>
          )}
          {options.map((o) => (
            <label key={o.id} className={styles.item}>
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                onChange={() => onToggle(o.id)}
              />
              {o.color && (
                <span className={styles.dot} style={{ background: o.color }} />
              )}
              <span className={styles.itemLabel}>{o.label}</span>
              {o.hint && <span className={styles.hint}>{o.hint}</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
