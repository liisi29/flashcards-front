import type { Color } from "../types";
// SemDot uses global classes from index.css: .sem-dot, .sem-grey, .sem-red, .sem-yellow, .sem-green
import "./SemDot.module.css";

interface Props {
  color: Color;
  selected: boolean;
  onClick: () => void;
}

const COLOR_CLASS: Record<string, string> = {
  null: "sem-grey",
  red: "sem-red",
  yellow: "sem-yellow",
  green: "sem-green",
};

export default function SemDot({ color, selected, onClick }: Props) {
  const key = color === null ? "null" : color;
  return (
    <div
      className={`sem-dot ${COLOR_CLASS[key]}${selected ? " selected" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );
}
