
import styles from './TextSelect.module.css';

export function TextSelect({
  value,
  noneLabel = '-- Vali --',
  onChange,
  options,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { _id: string; label: string }[];
  noneLabel: string;
}) {
  return (
     <select className={styles['text-select']} value={value} onChange={onChange}>
            <option value="">{noneLabel}</option>
            {options.map((s) => <option key={s._id} value={s._id}>{s.label}</option>)}
          </select>
         
  );
}