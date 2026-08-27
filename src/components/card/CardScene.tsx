import { useState } from "react";
import { CardFace } from "./CardFace";
import type { ICardSide } from "../../types";

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
}

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
      </div>
    </div>
  );
}
