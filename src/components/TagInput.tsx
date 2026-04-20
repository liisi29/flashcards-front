import styles from "./TagInput.module.css";
import { t } from "../strings";

interface Props {
  tags: string[];
  onChange: (_tags: string[]) => void;
}

export function TagInput({ tags, onChange }: Props) {
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const parsed = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    onChange(parsed);
  }

  return (
    <div className={styles.tagInputRow}>
      <label className={styles.label}>{t.labelTags}</label>
      <input
        className={styles.input}
        type="text"
        placeholder={t.placeholderTags}
        value={tags.join(", ")}
        onChange={handleInput}
      />
    </div>
  );
}
