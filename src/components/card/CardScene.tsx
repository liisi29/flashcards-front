import { useState } from "react";
import { CardFace } from "./CardFace";
import type { ICardSide } from "../../types";

interface Props {
  s1: ICardSide;
  s2: ICardSide;
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
      className={`card-scene${flipped ? " flipped" : ""}${
        className ? ` ${className}` : ""
      }`}
      style={style}
      onClick={interactive ? () => setFlipped((f) => !f) : undefined}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="card">
        <CardFace side={s1 || EMPTY} faceNum={1} />
        <CardFace side={s2 || EMPTY} faceNum={2} />
      </div>
    </div>
  );
}
