import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <NavLink to="/" className={styles.logo}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="6" width="18" height="13" rx="3" fill="#4a7c59" />
          <rect x="8" y="9" width="18" height="13" rx="3" fill="#2d3748" />
        </svg>
        <span>Flashcards</span>
      </NavLink>
      <nav className={styles.nav}>
        <NavLink
          to="/add"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          ✏️ Lisa
        </NavLink>
        <NavLink
          to="/learn"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          📖 Õpi
        </NavLink>
      </nav>
    </header>
  );
}
