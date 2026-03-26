import type { Color } from "../types";
// SemDot uses global classes from index.css: .sem-dot, .sem-grey, .sem-red, .sem-yellow, .sem-green
import styles from "./SemDot.module.css";

interface IProps {
  color: Color;
  selected: boolean;
  onClick: () => void;
  noHover?: boolean;
}

const COLOR_CLASS: Record<string, keyof typeof styles> = {
  null: "grey",
  red: "red",
  yellow: "yellow",
  green: "green",
};

export function SemDot({ color, selected, onClick, noHover }: IProps) {
  const key = color === null ? "null" : color;
  return (
    <div
      className={`${styles.semDotArea} ${noHover ? styles.noHover : ""} ${styles[COLOR_CLASS[key]]} ${selected ? styles.selected : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div
        className={`${styles.semDot} ${styles[COLOR_CLASS[key]]} ${selected ? styles.selected : ""}`}
      />
    </div>
  );
}
