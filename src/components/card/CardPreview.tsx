import { useState } from "react";
import type { ICardSide } from "../../types";
import { CardFace } from "./CardFace";
import { t } from "../../strings";
import styles from "./CardPreview.module.css";

/** The card being written, one side at a time, drawn with the real
    CardFace and sized like the single card in Õpi — same backgrounds,
    text sizes and formatting. Tap the card (or Külg 1 / 2) to turn it. */
export function CardPreview({ s1, s2 }: { s1: ICardSide; s2: ICardSide }) {
  const [shape, setShape] = useState<"portrait" | "landscape">("portrait");
  const [side, setSide] = useState<1 | 2>(1);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h3>{t.cardPreview}</h3>
        <div className={styles.sideSwitch}>
          {([1, 2] as const).map((n) => (
            <button
              key={n}
              type="button"
              className={side === n ? styles.on : undefined}
              onClick={() => setSide(n)}
            >
              {n === 1 ? t.side1 : t.side2}
            </button>
          ))}
        </div>
        <div className={styles.shapes}>
          <button
            type="button"
            className={shape === "portrait" ? styles.on : undefined}
            onClick={() => setShape("portrait")}
            title={t.shapePortrait}
          >
            ▯
          </button>
          <button
            type="button"
            className={shape === "landscape" ? styles.on : undefined}
            onClick={() => setShape("landscape")}
            title={t.shapeLandscape}
          >
            ▭
          </button>
        </div>
      </div>
      <div
        className={`${styles.stage}${shape === "landscape" ? ` shape-landscape ${styles.landscape}` : ""}`}
      >
        <button
          type="button"
          className={styles.box}
          title={t.cardPreviewFlip}
          onClick={() => setSide(side === 1 ? 2 : 1)}
        >
          <CardFace side={side === 1 ? s1 : s2} faceNum={side} />
        </button>
      </div>
    </div>
  );
}
