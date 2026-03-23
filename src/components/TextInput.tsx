
import styles from './TextInput.module.css';
export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
     <input className={styles['text-input']} type="text" placeholder={placeholder} autoFocus={autoFocus} 
     value={value} 
     onChange={onChange} />
         
  );
}