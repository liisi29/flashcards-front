import { t } from "../../strings";
import type { Color, ISubject } from "../../types";
import { SemDot } from "../../components/SemDot";
import { TextSelectWithLabel } from "../../components/TextSelectWithLabel";
import styles from "./LearnPage.module.css";

const COLORS: Color[] = [null, "red", "yellow", "green"];

const COLOR_LABELS: Record<string, string> = {
  null: t.colorNull,
  red: t.colorRed,
  yellow: t.colorYellow,
  green: t.colorGreen,
};

interface Props {
  subjects: ISubject[];
  topics: ISubject[];
  subjectId: string;
  topicIds: string[];
  activeColors: Color[];
  viewMode: "single" | "grid";
  onSubjectChange: (_id: string) => void;
  onToggleTopic: (_id: string) => void;
  onToggleColor: (_c: Color) => void;
  onViewModeChange: (_v: "single" | "grid") => void;
  onStart: () => void;
}

export function LearningSettings({
  subjects,
  topics,
  subjectId,
  topicIds,
  activeColors,
  viewMode,
  onSubjectChange,
  onToggleTopic,
  onToggleColor,
  onViewModeChange,
  onStart,
}: Props) {
  return (
    <div className={styles.page}>
      <div className="learn-config-box">
        <h2>{t.headingLearnSettings}</h2>

        <TextSelectWithLabel
          label={t.labelSubject}
          value={subjectId}
          onChange={(e) => onSubjectChange(e.target.value)}
          options={subjects}
          noneLabel={t.allSubjects}
        />

        {subjectId && topics.length > 0 && (
          <div className="learn-config-row">
            <label>{t.labelTopic}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {topics.map((topic) => (
                <label
                  key={topic._id}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={topicIds.includes(topic._id)}
                    onChange={() => onToggleTopic(topic._id)}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  {topic.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="learn-config-row">
          <label>{t.labelSemafor}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {COLORS.map((c) => (
              <label
                key={String(c)}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={activeColors.includes(c)}
                  onChange={() => onToggleColor(c)}
                  style={{ width: 20, height: 20, cursor: "pointer" }}
                />
                <SemDot
                  color={c}
                  selected
                  onClick={() => onToggleColor(c)}
                  noHover={true}
                />
                {COLOR_LABELS[String(c)]}
              </label>
            ))}
          </div>
        </div>

        <div className="learn-config-row">
          <label>{t.labelView}</label>
          <label>
            <input
              type="radio"
              name="vm"
              value="single"
              checked={viewMode === "single"}
              onChange={() => onViewModeChange("single")}
            />{" "}
            {t.viewSingle}
          </label>
          <label>
            <input
              type="radio"
              name="vm"
              value="grid"
              checked={viewMode === "grid"}
              onChange={() => onViewModeChange("grid")}
            />{" "}
            {t.viewGrid}
          </label>
        </div>

        <div className="form-buttons">
          <button className="btn-save" onClick={onStart}>
            {t.btnStart}
          </button>
        </div>
      </div>
    </div>
  );
}
