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
  topicIds: string[];
  activeColors: Color[];
  mode: "single" | "grid";
  totalCount: number;
  colorCounts: Record<string, number>;
  onSubjectChange: (_id: string) => void;
  onToggleTopic: (_id: string) => void;
  onToggleColor: (_c: Color) => void;
  onModeChange: (_m: "single" | "grid") => void;
  onShuffle: () => void;
}

export function LearnSubBar({
  subjects,
  topics,
  subjectId,
  topicIds,
  activeColors,
  mode,
  totalCount,
  colorCounts,
  onSubjectChange,
  onToggleTopic,
  onToggleColor,
  onModeChange,
  onShuffle,
}: Props) {
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      colorDropdownRef.current &&
      !colorDropdownRef.current.contains(e.target as Node)
    ) {
      setColorDropdownOpen(false);
    }
    if (
      topicDropdownRef.current &&
      !topicDropdownRef.current.contains(e.target as Node)
    ) {
      setTopicDropdownOpen(false);
    }
  };

  const topicLabel =
    topicIds.length === 0
      ? t.allTopics
      : topicIds.length === 1
        ? (topics.find((t) => t._id === topicIds[0])?.label ?? t.allTopics)
        : `${topicIds.length} teemat`;

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
          <div className={styles.colorDropdown} ref={topicDropdownRef}>
            <button
              className={styles.colorDropdownTrigger}
              onClick={() => setTopicDropdownOpen((o) => !o)}
            >
              {topicLabel}
              <span className={styles.dropdownCaret}>
                {topicDropdownOpen ? "▲" : "▼"}
              </span>
            </button>
            {topicDropdownOpen && (
              <div className={styles.colorDropdownMenu}>
                {topics.map((topic) => (
                  <label key={topic._id} className={styles.colorDropdownItem}>
                    <input
                      type="checkbox"
                      checked={topicIds.includes(topic._id)}
                      onChange={() => onToggleTopic(topic._id)}
                    />
                    {topic.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <span className={styles.cardCounts}>
          all: {totalCount}.{" "}
          {ALL_COLORS.map((c, i) => (
            <span key={String(c)} style={{ color: COLOR_DOT[String(c)] }}>
              {colorCounts[String(c)] ?? 0}
              {i < ALL_COLORS.length - 1 ? (
                <span style={{ color: "#a0aec0" }}> / </span>
              ) : null}
            </span>
          ))}
        </span>
      </div>

      <div className={styles.subBarRight}>
        {/* Raskusaste dropdown */}
        <div className={styles.colorDropdown} ref={colorDropdownRef}>
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
