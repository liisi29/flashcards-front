import { TextSelect } from "./TextSelect";
import styles from "./TextSelectWithLabel.module.css";

export function TextSelectWithLabel({
  label,
  value,
  noneLabel = "-- Vali --",
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { _id: string; label: string }[];
  noneLabel: string;
}) {
  return (
    <div className={styles["text-select-with-label"]}>
      <label>{label}</label>
      <TextSelect
        value={value}
        onChange={onChange}
        options={options}
        noneLabel={noneLabel}
      />
    </div>
  );
}
