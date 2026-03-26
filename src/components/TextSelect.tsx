import styles from "./TextSelect.module.css";

export function TextSelect({
  value,
  noneLabel = "-- Vali --",
  onChange,
  options,
  extraOptions,
  className,
}: {
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { _id: string; label: string }[];
  noneLabel: string;
  extraOptions?: { _id: string; label: string }[];
  className?: string;
}) {
  return (
    <select className={`${styles["text-select"]}${className ? ` ${className}` : ""}`} value={value} onChange={onChange}>
      <option value="">{noneLabel}</option>
      {options.map((s) => (
        <option key={s._id} value={s._id}>
          {s.label}
        </option>
      ))}
      {extraOptions?.map((s) => (
        <option key={s._id} value={s._id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
