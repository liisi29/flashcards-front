import type { Color } from "../types";
// SemDot uses global classes from index.css: .sem-dot, .sem-grey, .sem-red, .sem-yellow, .sem-green
import styles from "./SemDot.module.css";

interface Props {
  color: Color;
  selected: boolean;
  onClick: () => void;
}

const COLOR_CLASS: Record<string, keyof typeof styles> = {
  null: "grey",
  red: "red",
  yellow: "yellow",
  green: "green",
};

export function SemDot({ color, selected, onClick }: Props) {
  const key = color === null ? "null" : color;
  return (
    <div
      className={`${styles.semDotArea} ${styles[COLOR_CLASS[key]]} ${selected ? styles.selected : ""}`}
    >
      <div
        className={`${styles.semDot} ${styles[COLOR_CLASS[key]]} ${selected ? styles.selected : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
    </div>
  );
}
