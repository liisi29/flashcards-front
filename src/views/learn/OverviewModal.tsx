import { t } from "../../strings";
import type { Color, ICard } from "../../types";
import styles from "./OverviewModal.module.css";

const DOT: Record<string, string> = {
  null: "#718096",
  red: "#fc8181",
  yellow: "#f6e05e",
  green: "#68d391",
};

/** A read-only glance at the currently filtered deck — both languages
    side by side, with the difficulty colour. Opened from the Õpi bar
    before a session. */
export function OverviewModal({
  cards,
  colorOf,
  onClose,
}: {
  cards: ICard[];
  colorOf: (_c: ICard) => Color;
  onClose: () => void;
}) {
  const counts: Record<string, number> = {
    null: 0,
    red: 0,
    yellow: 0,
    green: 0,
  };
  for (const c of cards) counts[String(colorOf(c))] += 1;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2>{t.overviewHeading}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <p className={styles.summary}>
          {t.overviewCount(cards.length)}
          {(["null", "red", "yellow", "green"] as const).map((k) => (
            <span key={k} className={styles.sumChip}>
              <span
                className={styles.sumDot}
                style={{ background: DOT[k] }}
                aria-hidden
              />
              {counts[k]}
            </span>
          ))}
        </p>

        <div className={styles.list}>
          {cards.map((c) => (
            <div key={c._id} className={styles.row}>
              <span
                className={styles.dot}
                style={{ background: DOT[String(colorOf(c))] }}
                aria-hidden
              />
              <div className={styles.cell}>
                <span className={styles.main}>{c.s1.text}</span>
                {c.s1.text2 && <span className={styles.sub}>{c.s1.text2}</span>}
              </div>
              <div className={styles.cell}>
                <span className={styles.main}>{c.s2.text}</span>
                {c.s2.text2 && <span className={styles.sub}>{c.s2.text2}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
