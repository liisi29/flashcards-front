import { useEffect, useState } from "react";
import styles from "./TagInput.module.css";
import { t } from "../strings";
import { useTags } from "../contexts/TagsContext";
import { api } from "../api";
import { TAG_COLORS } from "../tagColors";

const PRESET_COLORS = TAG_COLORS;

interface Props {
  tagIds: string[];
  subjectId: string;
  topicId: string;
  onChange: (_ids: string[]) => void;
  /** hide the "Sildid" label and tighten margins (for list rows) */
  compact?: boolean;
}

export function TagInput({
  tagIds,
  subjectId,
  topicId,
  onChange,
  compact = false,
}: Props) {
  const { tagsForTopic, ensureSubject, reloadSubject } = useTags();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  const tags = topicId ? tagsForTopic(subjectId, topicId) : [];

  function toggle(id: string) {
    if (tagIds.includes(id)) {
      onChange(tagIds.filter((x) => x !== id));
    } else {
      onChange([...tagIds, id]);
    }
  }

  async function createTag() {
    const name = newName.trim().toLowerCase();
    if (!name || !topicId) return;
    const tag = await api.createTag(name, newColor, subjectId, topicId);
    await reloadSubject(subjectId);
    onChange([...tagIds, tag._id]);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setShowNew(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      createTag();
    }
    if (e.key === "Escape") {
      setShowNew(false);
      setNewName("");
    }
  }

  if (!topicId) return null;

  return (
    <div
      className={`${styles.tagInputRow}${compact ? ` ${styles.compact}` : ""}`}
    >
      {!compact && <label className={styles.label}>{t.labelTags}</label>}
      <div className={styles.tagBox}>
        <div className={styles.chips}>
          {tags.map((tag) => {
            const active = tagIds.includes(tag._id);
            return (
              <button
                key={tag._id}
                type="button"
                className={styles.chip}
                style={
                  active
                    ? {
                        background: tag.color,
                        color: "#fff",
                        borderColor: tag.color,
                      }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() => toggle(tag._id)}
              >
                {tag.name}
              </button>
            );
          })}
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setShowNew((v) => !v)}
          >
            +
          </button>
        </div>

        {showNew && (
          <div className={styles.newTagRow}>
            <input
              autoFocus
              className={styles.input}
              placeholder={t.placeholderTags}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className={styles.colorPicker}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={styles.colorDot}
                  style={{
                    background: c,
                    outline: newColor === c ? "2px solid #2d3748" : "none",
                  }}
                  onClick={() => setNewColor(c)}
                />
              ))}
              <label
                className={styles.colorDot}
                style={{
                  background: newColor,
                  outline: PRESET_COLORS.includes(newColor)
                    ? "none"
                    : "2px solid #2d3748",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                }}
                title={t.tagColorCustom}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "#fff",
                    mixBlendMode: "difference",
                  }}
                >
                  🎨
                </span>
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    opacity: 0,
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={createTag}
            >
              {t.btnSave}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
