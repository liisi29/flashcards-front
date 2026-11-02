import { useState } from "react";
import type { ISubject } from "../types";
import { TextSelectWithLabel } from "./TextSelectWithLabel";
import styles from "./SubjectSelect.module.css";
import { t } from "../strings";

const NEW_VALUE = "__new__";
const NEW_OPTION = [{ _id: NEW_VALUE, label: t.addNew }];

interface Props {
  subjects: ISubject[];
  value: string;
  onChange: (_id: string) => void;
  onCreated: (_subject: ISubject) => void;
  onCreate: (_label: string) => Promise<ISubject>;
  label?: string;
  placeholder?: string;
  newPlaceholder?: string;
}

export function SubjectSelect({
  subjects,
  value,
  onChange,
  onCreated,
  onCreate,
  label = "",
  placeholder = t.placeholderSubject,
  newPlaceholder = t.placeholderNewSubject,
}: Props) {
  const [newLabel, setNewLabel] = useState("");
  // "+ new" is this component's own state, never passed up via onChange —
  // forms used to receive "__new__" as the id and saved 200+ cards with it
  const [showNew, setShowNew] = useState(false);

  async function handleCreate() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const created = await onCreate(trimmed);
    onCreated(created);
    setNewLabel("");
    setShowNew(false);
  }

  return (
    <div className={styles["new-subject-container"]}>
      <TextSelectWithLabel
        label={label}
        value={showNew ? NEW_VALUE : value}
        noneLabel={placeholder}
        options={subjects}
        extraOptions={NEW_OPTION}
        onChange={(e) => {
          if (e.target.value === NEW_VALUE) {
            setShowNew(true);
            return;
          }
          setShowNew(false);
          onChange(e.target.value);
        }}
      />

      {showNew && (
        <div className={styles["new-subject"]}>
          <input
            type="text"
            placeholder={newPlaceholder}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <button className="btn-save" onClick={handleCreate}>
            +
          </button>
        </div>
      )}
    </div>
  );
}
