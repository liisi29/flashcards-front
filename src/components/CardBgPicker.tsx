import { CARD_BGS, setCardBgId } from "../cardBackgrounds";
import { useCardBgs } from "../useCardBgs";
import { t } from "../strings";
import styles from "./CardBgPicker.module.css";

/** Two rows of swatches to pick the global side-1 / side-2 card background.
    By default writes straight to localStorage; pass `onPick` to route the
    choice somewhere else (e.g. server-synced settings). */
export function CardBgPicker({
  onPick,
}: {
  onPick?: (_side: 1 | 2, _bgId: string) => void;
}) {
  const { s1, s2 } = useCardBgs();
  const pick = onPick ?? ((side: 1 | 2, id: string) => setCardBgId(side, id));

  const row = (side: 1 | 2, current: string) => (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{side === 1 ? t.side1 : t.side2}</span>
      <div className={styles.swatches}>
        {CARD_BGS.map((bg) => (
          <button
            key={bg.id}
            type="button"
            title={bg.label}
            aria-label={bg.label}
            aria-pressed={current === bg.id}
            className={`${styles.swatch}${
              current === bg.id ? ` ${styles.selected}` : ""
            }`}
            style={{ background: bg.css }}
            onClick={() => pick(side, bg.id)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={styles.picker}>
      {row(1, s1)}
      {row(2, s2)}
    </div>
  );
}
