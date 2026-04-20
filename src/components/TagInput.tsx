import { useState, useEffect } from "react";
import styles from "./TagInput.module.css";
import { t } from "../strings";
import { useTags } from "../contexts/TagsContext";
import { api } from "../api";
import type { ITag } from "../types";

const PRESET_COLORS = ["#94a3b8", "#f87171", "#fb923c", "#facc15", "#4ade80", "#60a5fa", "#c084fc", "#f472b6"];

interface Props {
  tagIds: string[];
  subjectId: string;
  topicId: string;
  onChange: (_ids: string[]) => void;
}

export function TagInput({ tagIds, subjectId, topicId, onChange }: Props) {
  const { reloadKey, reload } = useTags();
  const [tags, setTags] = useState<ITag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!topicId) { setTags([]); return; }
    api.getTags(subjectId, topicId).then(setTags).catch(() => {});
  }, [subjectId, topicId, reloadKey]);

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
    reload();
    onChange([...tagIds, tag._id]);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setShowNew(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); createTag(); }
    if (e.key === "Escape") { setShowNew(false); setNewName(""); }
  }

  if (!topicId) return null;

  return (
    <div className={styles.tagInputRow}>
      <label className={styles.label}>{t.labelTags}</label>
      <div className={styles.tagBox}>
        <div className={styles.chips}>
          {tags.map((tag) => {
            const active = tagIds.includes(tag._id);
            return (
              <button
                key={tag._id}
                type="button"
                className={styles.chip}
                style={active
                  ? { background: tag.color, color: "#fff", borderColor: tag.color }
                  : { borderColor: tag.color, color: tag.color }}
                onClick={() => toggle(tag._id)}
              >
                {tag.name}
              </button>
            );
          })}
          <button type="button" className={styles.addBtn} onClick={() => setShowNew((v) => !v)}>
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
                  style={{ background: c, outline: newColor === c ? "2px solid #2d3748" : "none" }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <button type="button" className={styles.saveBtn} onClick={createTag}>
              {t.btnSave}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
