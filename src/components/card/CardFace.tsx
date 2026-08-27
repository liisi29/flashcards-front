import type { ICardSide } from "../../types";
import { bgCss, DEFAULT_BG_1, DEFAULT_BG_2 } from "../../cardBackgrounds";
import { useCardBgs } from "../../useCardBgs";
// CardFace uses global classes from index.css: .cardFace, .cardFace1, .cardFace2, .cardText

interface Props {
  side: ICardSide;
  faceNum: 1 | 2;
}

export function CardFace({ side, faceNum }: Props) {
  const hasPhoto = !!side.photo;
  const hasText = !!(side.text || side.text2);
  const { s1, s2 } = useCardBgs();

  const bg = hasPhoto
    ? "#1a1a1a"
    : faceNum === 1
      ? bgCss(s1, DEFAULT_BG_1)
      : bgCss(s2, DEFAULT_BG_2);

  return (
    <div
      className={`cardFace cardFace${faceNum}${hasPhoto && hasText ? " hasBoth" : ""}`}
      style={{ background: bg }}
    >
      {hasPhoto && <img src={side.photo} alt={side.text || ""} />}
      {hasText && (
        <div className="cardText">
          {side.text && <div className="cardTextPrimary">{side.text}</div>}
          {side.text2 && (
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "normal",
                marginTop: 8,
                opacity: 0.85,
              }}
              className="cardTextSecondary"
            >
              {side.text2}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
