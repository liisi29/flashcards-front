import { t } from "../strings";
import type { Color, Subject } from "../types";
import { SemDot } from "../components/SemDot";
import { TextSelectWithLabel } from "../components/TextSelectWithLabel";
import styles from "./LearnPage.module.css";

const COLORS: Color[] = [null, "red", "yellow", "green"];

interface Props {
  subjects: Subject[];
  topics: Subject[];
  subjectId: string;
  topicId: string;
  activeColors: Color[];
  random: boolean;
  viewMode: "single" | "grid";
  onSubjectChange: (_id: string) => void;
  onTopicChange: (_id: string) => void;
  onToggleColor: (_c: Color) => void;
  onRandomChange: (_v: boolean) => void;
  onViewModeChange: (_v: "single" | "grid") => void;
  onStart: () => void;
}

export function LearningSettings({
  subjects,
  topics,
  subjectId,
  topicId,
  activeColors,
  random,
  viewMode,
  onSubjectChange,
  onTopicChange,
  onToggleColor,
  onRandomChange,
  onViewModeChange,
  onStart,
}: Props) {
  return (
    <div className={styles.page}>
      <div className="learn-config-box">
        <h2>{t.headingLearn}</h2>

        <TextSelectWithLabel
          label={t.labelSubject}
          value={subjectId}
          onChange={(e) => onSubjectChange(e.target.value)}
          options={subjects}
          noneLabel={t.allSubjects}
        />

        {subjectId && topics.length > 0 && (
          <TextSelectWithLabel
            label={t.labelTopic}
            value={topicId}
            onChange={(e) => onTopicChange(e.target.value)}
            options={topics}
            noneLabel={t.allTopics}
          />
        )}

        <div className="learn-config-row">
          <label>{t.labelSemafor}</label>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORS.map((c) => (
              <SemDot
                key={String(c)}
                color={c}
                selected={activeColors.includes(c)}
                onClick={() => onToggleColor(c)}
              />
            ))}
          </div>
        </div>

        <div className="learn-config-row">
          <label>
            <input
              type="checkbox"
              checked={random}
              onChange={(e) => onRandomChange(e.target.checked)}
            />{" "}
            {t.labelRandom}
          </label>
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
