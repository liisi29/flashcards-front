import styles from "./TextInput.module.css";

interface Props {
  value: string;
  onChange: (
    _e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** render a <textarea> that allows line breaks */
  multiline?: boolean;
  rows?: number;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  multiline = false,
  rows = 2,
}: Props) {
  if (multiline) {
    return (
      <textarea
        className={styles["text-input"]}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        onChange={onChange}
      />
    );
  }
  return (
    <input
      className={styles["text-input"]}
      type="text"
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={value}
      onChange={onChange}
    />
  );
}
