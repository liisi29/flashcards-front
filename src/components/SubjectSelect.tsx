import { useState } from 'react';
import type { Subject } from '../types';
import styles from './SubjectSelect.module.css';

const NEW_VALUE = '__new__';

interface Props {
  subjects: Subject[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (subject: Subject) => void;
  onCreate: (label: string) => Promise<Subject>;
  placeholder?: string;
  newPlaceholder?: string;
}

export default function SubjectSelect({
  subjects,
  value,
  onChange,
  onCreated,
  onCreate,
  placeholder = '-- Vali --',
  newPlaceholder = 'Uus nimi...',
}: Props) {
  const [newLabel, setNewLabel] = useState('');

  const showNew = value === NEW_VALUE;

  async function handleCreate() {
    const label = newLabel.trim();
    if (!label) return;
    const created = await onCreate(label);
    onCreated(created);
    setNewLabel('');
  }

  return (
    <div className={styles['new-subject-container']}>
      <select
        value={showNew ? NEW_VALUE : value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {subjects.map((s) => (
          <option key={s._id} value={s._id}>{s.label}</option>
        ))}
        <option value={NEW_VALUE}>+ Lisa uus</option>
      </select>

      {showNew && (
        <div className={styles['new-subject']}>
          <input
            type="text"
            placeholder={newPlaceholder}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button className="btn-save" onClick={handleCreate}>+</button>
        </div>
      )}
    </div>
  );
}