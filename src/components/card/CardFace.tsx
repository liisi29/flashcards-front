import type { ICardSide } from "../../types";
import { bgCss, DEFAULT_BG_1, DEFAULT_BG_2 } from "../../cardBackgrounds";
import { useCardBgs } from "../../useCardBgs";
import { useFitText } from "../../useFitText";
import {
  hasBold,
  lineStyle,
  renderLine,
  stripMarks,
} from "../../utils/richText";
// CardFace uses global classes from index.css: .cardFace, .cardFace1, .cardFace2, .cardText

interface Props {
  side: ICardSide;
  faceNum: 1 | 2;
}

export function CardFace({ side, faceNum }: Props) {
  const hasPhoto = !!side.photo;
  const hasText = !!(side.text || side.text2);
  const { s1, s2 } = useCardBgs();
  // shrink the text block until it fits the face — big by default, smaller
  // only when a card's word(s) would otherwise overflow / wrap badly
  const { ref, containerRef } = useFitText<HTMLDivElement, HTMLDivElement>(14, [
    side.text,
    side.text2,
    faceNum,
    // a line's size step changes how much fits
    JSON.stringify([side.fmt1, side.fmt2]),
  ]);

  const bg = hasPhoto
    ? "#1a1a1a"
    : faceNum === 1
      ? bgCss(s1, DEFAULT_BG_1)
      : bgCss(s2, DEFAULT_BG_2);

  return (
    <div
      ref={containerRef}
      className={`cardFace cardFace${faceNum}${hasPhoto && hasText ? " hasBoth" : ""}`}
      style={{ background: bg }}
    >
      {hasPhoto && <img src={side.photo} alt={stripMarks(side.text || "")} />}
      {hasText && (
        <div className="cardText" ref={ref}>
          {side.text && (
            <div
              className="cardTextPrimary"
              style={{
                ...lineStyle(side.text),
                // rida 1 is bold by default — once some words are made
                // bold, the rest goes normal so they stand out
                ...(hasBold(side.text) && { fontWeight: "normal" }),
              }}
            >
              {renderLine(side.text, side.fmt1)}
            </div>
          )}
          {side.text2 && (
            <div
              style={{
                fontWeight: "normal",
                marginTop: 8,
                opacity: 0.85,
                ...lineStyle(side.text2),
              }}
              className="cardTextSecondary"
            >
              {renderLine(side.text2, side.fmt2)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
