import { useState } from "react";
import { CardFace } from "./CardFace";
import type { ICardSide, Color } from "../../types";

interface Props {
  s1: ICardSide;
  s2: ICardSide;
  /** class(es) on the OUTER wrapper — put swipe/enter transforms here, never
      on .card-scene itself (it holds a perspective'd 3D child and gets
      render artifacts when transformed). */
  className?: string;
  style?: React.CSSProperties;
  /** start showing the back side (used for the outgoing card so it keeps its face) */
  initialFlipped?: boolean;
  interactive?: boolean;
  onAnimationEnd?: () => void;
  /** difficulty dot shown in the top corner; nothing when null */
  cornerColor?: Color;
}

const DOT_BG: Record<string, string> = {
  red: "#da1414",
  yellow: "#f6e05e",
  green: "#0a8338",
};

const EMPTY: ICardSide = { text: "", text2: "", photo: "" };

/** Just the 3D flip scene — no sem-dots, no meta. */
export function CardScene({
  s1,
  s2,
  className = "",
  style,
  initialFlipped = false,
  interactive = true,
  onAnimationEnd,
  cornerColor = null,
}: Props) {
  const [flipped, setFlipped] = useState(initialFlipped);
  return (
    <div
      className={`card-scene-wrap${className ? ` ${className}` : ""}`}
      style={style}
      onAnimationEnd={onAnimationEnd}
    >
      <div
        className={`card-scene${flipped ? " flipped" : ""}`}
        onClick={interactive ? () => setFlipped((f) => !f) : undefined}
      >
        <div className="card">
          <CardFace side={s1 || EMPTY} faceNum={1} />
          <CardFace side={s2 || EMPTY} faceNum={2} />
        </div>
        {cornerColor && (
          <span
            className="card-corner-dot"
            style={{ background: DOT_BG[cornerColor] }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
