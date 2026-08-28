import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./Header.module.css";
import { t } from "../strings";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { useUser } from "../useUser";
import { SettingsModal } from "./SettingsModal";

export default function Header() {
  const { open, setOpen, slot } = useMobileMenu();
  const location = useLocation();
  const user = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  function openSettings() {
    setOpen(false);
    setSettingsOpen(true);
  }

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, setOpen]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinks = (
    <>
      <NavLink
        to="/add"
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        {t.navAdd}
      </NavLink>
      <NavLink
        to="/learn"
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        {t.navLearn}
      </NavLink>
    </>
  );

  const userChip = user ? (
    <button
      className={styles.userChip}
      onClick={openSettings}
      title={t.settingsHeading}
    >
      <span className={styles.userDot} aria-hidden />
      {user.label}
    </button>
  ) : null;

  return (
    <header className={styles.header}>
      <NavLink to="/" className={styles.logo}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="6" width="18" height="13" rx="3" fill="#4a7c59" />
          <rect x="8" y="9" width="18" height="13" rx="3" fill="#2d3748" />
        </svg>
        <span>{t.appName}</span>
      </NavLink>

      {/* Desktop nav */}
      <nav className={styles.nav}>
        {navLinks}
        {userChip}
      </nav>

      {/* Mobile hamburger */}
      <button
        className={styles.hamburger}
        aria-label={open ? t.menuClose : t.menuOpen}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={`${styles.bars} ${open ? styles.barsOpen : ""}`} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className={styles.drawerOverlay} onClick={() => setOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <nav className={styles.drawerNav}>
              {navLinks}
              {userChip}
            </nav>
            {slot && (
              <>
                <div className={styles.drawerDivider} />
                <div className={styles.drawerSlotLabel}>{t.menuFilters}</div>
                <div className={styles.drawerSlot}>{slot}</div>
              </>
            )}
          </div>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </header>
  );
}
