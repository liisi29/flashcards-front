import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./Header.module.css";
import { t } from "../strings";
import { useMobileMenu } from "../contexts/MobileMenuContext";
import { useUser } from "../useUser";
import { useSubjects } from "../contexts/SubjectsContext";
import { useCurrentSubject } from "../contexts/CurrentSubjectContext";
import { api } from "../api";

const NEW = "__new__";

export default function Header() {
  const { open, setOpen, slot } = useMobileMenu();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const { subjects, reload: reloadSubjects } = useSubjects();
  const { subjectId, setSubjectId } = useCurrentSubject();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(null);
  }, [location.pathname, setOpen]);

  // a page that drops its filters (e.g. leaving Õpi) can't leave an empty
  // filters drawer open
  useEffect(() => {
    if (!slot && open === "filters") setOpen(null);
  }, [slot, open, setOpen]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Aine struktuur takes its subject from the URL, so switching subject
  // there means going to the other subject's page — otherwise the page
  // just resets the pick back to its own subject
  function pickSubject(id: string) {
    setSubjectId(id);
    if (location.pathname.startsWith("/structure/")) {
      navigate(id ? `/structure/${id}` : "/add", { replace: true });
    }
  }

  async function createSubject() {
    const name = newName.trim();
    if (!name) return;
    const created = await api.createSubject(name);
    reloadSubjects();
    pickSubject(created._id);
    setNewName("");
    setCreating(false);
  }

  const subjectPicker = creating ? (
    <span className={styles.subjectNewRow}>
      <input
        autoFocus
        className={styles.subjectNewInput}
        placeholder={t.placeholderNewSubject}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") createSubject();
          if (e.key === "Escape") {
            setCreating(false);
            setNewName("");
          }
        }}
      />
      <button className={styles.subjectNewBtn} onClick={createSubject}>
        +
      </button>
    </span>
  ) : (
    <select
      className={styles.subjectSelect}
      value={subjectId}
      onChange={(e) => {
        if (e.target.value === NEW) setCreating(true);
        else pickSubject(e.target.value);
      }}
    >
      <option value="">{t.pickSubject}</option>
      {subjects.map((s) => (
        <option key={s._id} value={s._id}>
          {s.label}
        </option>
      ))}
      <option value={NEW}>{t.headerSubjectNew}</option>
    </select>
  );

  const navLinks = (
    <>
      <NavLink
        to="/add"
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        <span className={styles.linkIcon} aria-hidden>
          ✏️
        </span>
        <span>{t.navAdd}</span>
      </NavLink>
      <NavLink
        to="/learn"
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        <span className={styles.linkIcon} aria-hidden>
          📖
        </span>
        <span>{t.navLearn}</span>
      </NavLink>
      <NavLink
        to="/pimekiri"
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.active}` : styles.link
        }
      >
        <span className={styles.linkIcon} aria-hidden>
          ⌨️
        </span>
        <span>{t.navPimekiri}</span>
      </NavLink>
    </>
  );

  // Desktop: a rounded pill. Mobile drawer: a plain list row like the nav
  // links, so all three read as one consistent list. Both link to /settings.
  const userChipDesktop = user ? (
    <NavLink
      to="/settings"
      className={({ isActive }) =>
        isActive ? `${styles.userChip} ${styles.userChipOn}` : styles.userChip
      }
      title={t.settingsHeading}
    >
      <span className={styles.gearIcon} aria-hidden>
        ⚙️
      </span>
      {user.label}
    </NavLink>
  ) : null;

  const userRowDrawer = user ? (
    <NavLink
      to="/settings"
      className={({ isActive }) =>
        isActive ? `${styles.link} ${styles.active}` : styles.link
      }
    >
      <span className={styles.linkIcon} aria-hidden>
        ⚙️
      </span>
      <span>{user.label}</span>
    </NavLink>
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
        {subjectPicker}
        {navLinks}
        {userChipDesktop}
      </nav>

      {/* Mobile buttons: filters for this page (only when the page has
          any), and the hamburger for switching pages */}
      <div className={styles.mobileBtns}>
        {slot && (
          <button
            className={`${styles.filterBtn}${open === "filters" ? ` ${styles.filterBtnOn}` : ""}`}
            aria-label={open === "filters" ? t.menuClose : t.menuFiltersOpen}
            aria-expanded={open === "filters"}
            onClick={() => setOpen(open === "filters" ? null : "filters")}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              <path
                d="M3 5h14M3 10h14M3 15h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <circle cx="7" cy="5" r="2.2" fill="currentColor" />
              <circle cx="13" cy="10" r="2.2" fill="currentColor" />
              <circle cx="8" cy="15" r="2.2" fill="currentColor" />
            </svg>
          </button>
        )}
        <button
          className={styles.hamburger}
          aria-label={open === "nav" ? t.menuClose : t.menuOpen}
          aria-expanded={open === "nav"}
          onClick={() => setOpen(open === "nav" ? null : "nav")}
        >
          <span
            className={`${styles.bars} ${open === "nav" ? styles.barsOpen : ""}`}
          />
        </button>
      </div>

      {/* Mobile drawer — page navigation */}
      {open === "nav" && (
        <div className={styles.drawerOverlay} onClick={() => setOpen(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerSubject}>{subjectPicker}</div>
            <nav className={styles.drawerNav}>
              {navLinks}
              {userRowDrawer}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile drawer — this page's filters */}
      {open === "filters" && slot && (
        <div className={styles.drawerOverlay} onClick={() => setOpen(null)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerSlotLabel}>{t.menuFilters}</div>
            <div className={styles.drawerSlot}>{slot}</div>
          </div>
        </div>
      )}
    </header>
  );
}
