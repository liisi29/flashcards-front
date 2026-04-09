import { useRef, useState } from "react";
import { t } from "../../strings";
import type { Color, ISubject } from "../../types";
import { TextSelect } from "../../components/TextSelect";
import styles from "./LearnSubBar.module.css";

const ALL_COLORS: Color[] = [null, "red", "yellow", "green"];
const COLOR_LABELS: Record<string, string> = {
  null: t.colorNull,
  red: t.colorRed,
  yellow: t.colorYellow,
  green: t.colorGreen,
};
const COLOR_DOT: Record<string, string> = {
  null: "#718096",
  red: "#fc8181",
  yellow: "#f6e05e",
  green: "#68d391",
};

interface Props {
  subjects: ISubject[];
  topics: ISubject[];
  subjectId: string;
  topicId: string;
  activeColors: Color[];
  mode: "single" | "grid";
  totalCount: number;
  colorCounts: Record<string, number>;
  onSubjectChange: (_id: string) => void;
  onTopicChange: (_id: string) => void;
  onToggleColor: (_c: Color) => void;
  onModeChange: (_m: "single" | "grid") => void;
  onShuffle: () => void;
}

export function LearnSubBar({
  subjects,
  topics,
  subjectId,
  topicId,
  activeColors,
  mode,
  totalCount,
  colorCounts,
  onSubjectChange,
  onTopicChange,
  onToggleColor,
  onModeChange,
  onShuffle,
}: Props) {
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setColorDropdownOpen(false);
    }
  };

  return (
    <div className={styles.subBar} onMouseDown={handleMouseDown}>
      <div className={styles.subBarLeft}>
        <TextSelect
          value={subjectId}
          onChange={(e) => onSubjectChange(e.target.value)}
          options={subjects}
          noneLabel={t.allSubjects}
          className={styles.subBarSelect}
        />
        {subjectId && topics.length > 0 && (
          <TextSelect
            value={topicId}
            onChange={(e) => onTopicChange(e.target.value)}
            options={topics}
            noneLabel={t.allTopics}
            className={styles.subBarSelect}
          />
        )}
        <span className={styles.cardCounts}>
          all: {totalCount}.{" "}
          {ALL_COLORS.map((c, i) => (
            <span
              key={String(c)}
              style={{ color: COLOR_DOT[String(c)] }}
            >
              {colorCounts[String(c)] ?? 0}
              {i < ALL_COLORS.length - 1 ? <span style={{ color: "#a0aec0" }}> / </span> : null}
            </span>
          ))}
        </span>
      </div>

      <div className={styles.subBarRight}>
        {/* Raskusaste dropdown */}
        <div className={styles.colorDropdown} ref={dropdownRef}>
          <button
            className={styles.colorDropdownTrigger}
            onClick={() => setColorDropdownOpen((o) => !o)}
          >
            Raskusaste
            <span className={styles.colorDots}>
              {ALL_COLORS.filter((c) => !!c).map((c) => (
                <span
                  key={String(c)}
                  className={styles.colorDotSmall}
                  style={{ background: COLOR_DOT[String(c)] }}
                />
              ))}
            </span>
            <span className={styles.dropdownCaret}>
              {colorDropdownOpen ? "▲" : "▼"}
            </span>
          </button>
          {colorDropdownOpen && (
            <div className={styles.colorDropdownMenu}>
              {ALL_COLORS.map((c) => (
                <label key={String(c)} className={styles.colorDropdownItem}>
                  <input
                    type="checkbox"
                    checked={activeColors.includes(c)}
                    onChange={() => onToggleColor(c)}
                  />
                  <span
                    className={styles.colorDotSmall}
                    style={{ background: COLOR_DOT[String(c)] }}
                  />
                  {COLOR_LABELS[String(c)]}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Shuffle — grid only */}
        {mode === "grid" && (
          <button className={styles.subBarBtn} onClick={onShuffle}>
            {t.btnShuffle}
          </button>
        )}

        {/* View toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn}${mode === "single" ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => onModeChange("single")}
            title="Üks kaart"
          >
            □
          </button>
          <button
            className={`${styles.viewToggleBtn}${mode === "grid" ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => onModeChange("grid")}
            title="Kõik kaardid"
          >
            ⊞
          </button>
        </div>
      </div>
    </div>
  );
}
