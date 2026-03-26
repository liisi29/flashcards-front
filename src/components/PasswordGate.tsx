import { useState } from "react";
import styles from "./PasswordGate.module.css";

const SESSION_KEY = "fc-unlocked";
const CORRECT = import.meta.env.VITE_APP_PASSWORD as string;

export function isUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export default function PasswordGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (input === CORRECT) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  }

  return (
    <div className={styles.overlay}>
      <form className={styles.box} onSubmit={submit}>
        <h1>Flashcards</h1>
        <p>Sisesta parool</p>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          className={error ? styles.inputError : styles.input}
          placeholder="Parool..."
        />
        {error && <p className={styles.error}>Vale parool</p>}
        <button type="submit" className={styles.btn}>
          Sisene
        </button>
      </form>
    </div>
  );
}
