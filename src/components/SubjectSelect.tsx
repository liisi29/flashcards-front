import { useState } from "react";
import type { Subject } from "../types";
import { TextSelectWithLabel } from "./TextSelectWithLabel";
import styles from "./SubjectSelect.module.css";

const NEW_VALUE = "__new__";
const NEW_OPTION = [{ _id: NEW_VALUE, label: "+ Lisa uus" }];

interface Props {
  subjects: Subject[];
  value: string;
  onChange: (_id: string) => void;
  onCreated: (_subject: Subject) => void;
  onCreate: (_label: string) => Promise<Subject>;
  label?: string;
  placeholder?: string;
  newPlaceholder?: string;
}

export default function SubjectSelect({
  subjects,
  value,
  onChange,
  onCreated,
  onCreate,
  label = "",
  placeholder = "-- Vali --",
  newPlaceholder = "Uus nimi...",
}: Props) {
  const [newLabel, setNewLabel] = useState("");

  const showNew = value === NEW_VALUE;

  async function handleCreate() {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    const created = await onCreate(trimmed);
    onCreated(created);
    setNewLabel("");
  }

  return (
    <div className={styles["new-subject-container"]}>
      <TextSelectWithLabel
        label={label}
        value={showNew ? NEW_VALUE : value}
        noneLabel={placeholder}
        options={subjects}
        extraOptions={NEW_OPTION}
        onChange={(e) => onChange(e.target.value)}
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
