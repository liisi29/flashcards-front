import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../../strings";
import { clearUser } from "../../user";
import { useUser } from "../../useUser";
import { useSettings } from "../../contexts/SettingsContext";
import { useCards } from "../../contexts/CardsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { useSubjects } from "../../contexts/SubjectsContext";
import { CardBgPicker } from "../../components/CardBgPicker";
import type { Color, ICard } from "../../types";
import { cardColor as colorForProgress } from "../../utils/cardProgress";
import styles from "./SettingsPage.module.css";

function cardColor(c: ICard) {
  return colorForProgress(c.progress);
}

const PROGRESS_COLORS: {
  key: string;
  color: Color;
  label: string;
  dot: string;
}[] = [
  { key: "null", color: null, label: t.colorNull, dot: "#718096" },
  { key: "red", color: "red", label: t.colorRed, dot: "#fc8181" },
  { key: "yellow", color: "yellow", label: t.colorYellow, dot: "#f6e05e" },
  { key: "green", color: "green", label: t.colorGreen, dot: "#68d391" },
];

/** Per-user preferences, synced to the server (userstate.settings) so they
    follow the person across devices. Reached from the name chip. */
export function SettingsPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { settings, loading, lastActive, setSetting } = useSettings();
  const { subjectId } = useCurrentSubject();
  const { subjectLabel } = useSubjects();
  const { cardsFor, ensureSubject } = useCards();

  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  const cards = subjectId ? cardsFor(subjectId) : undefined;
  const counts: Record<string, number> = {
    null: 0,
    red: 0,
    yellow: 0,
    green: 0,
  };
  for (const c of cards ?? []) counts[String(cardColor(c))] += 1;
  const total = cards?.length ?? 0;

  function switchUser() {
    clearUser(); // re-shows the UserGate picker
    navigate("/");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <h1>{t.settingsHeading}</h1>
          {user && (
            <span className={styles.whoBlock}>
              <span className={styles.who}>{user.label}</span>
              {lastActive && (
                <span className={styles.lastActive}>
                  {t.lastActivePrefix}
                  {new Date(lastActive).toLocaleDateString("et-EE")}
                </span>
              )}
            </span>
          )}
        </div>
        {loading && <p className={styles.syncing}>{t.settingsSyncing}</p>}

        <div className={styles.grid}>
          {subjectId && (
            <section className={`${styles.section} ${styles.sectionWide}`}>
              <h2>
                {t.settingsProgress}
                <span className={styles.progressSubject}>
                  {subjectLabel(subjectId)}
                </span>
              </h2>
              {cards === undefined ? (
                <p className={styles.hint}>{t.settingsSyncing}</p>
              ) : (
                <div className={styles.progress}>
                  {PROGRESS_COLORS.map(({ key, color, label, dot }) => {
                    const n = counts[key];
                    const pct = total ? Math.round((n / total) * 100) : 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={styles.progressRow}
                        onClick={() =>
                          navigate("/learn", { state: { onlyColor: color } })
                        }
                      >
                        <span
                          className={styles.progressDot}
                          style={{ background: dot }}
                          aria-hidden
                        />
                        <span className={styles.progressLabel}>{label}</span>
                        <div className={styles.progressBar}>
                          <div
                            className={styles.progressFill}
                            style={{ width: `${pct}%`, background: dot }}
                          />
                        </div>
                        <span className={styles.progressCount}>
                          {n} · {pct}%
                        </span>
                      </button>
                    );
                  })}
                  <p className={styles.progressTotal}>
                    {t.settingsProgressTotal(total)}
                  </p>
                </div>
              )}
            </section>
          )}

          <section className={`${styles.section} ${styles.sectionWide}`}>
            <h2>{t.cardBg}</h2>
            <CardBgPicker
              onPick={(side, id) =>
                setSetting(side === 1 ? "cardBgS1" : "cardBgS2", id)
              }
            />
          </section>

          <section className={styles.section}>
            <h2>{t.settingsStartSide}</h2>
            <p className={styles.hint}>{t.settingsStartSideHint}</p>
            <div className={styles.chips}>
              <button
                type="button"
                className={`${styles.chip}${
                  settings.startSide === 1 ? ` ${styles.chipOn}` : ""
                }`}
                onClick={() => setSetting("startSide", 1)}
              >
                {t.settingsStartSide1}
              </button>
              <button
                type="button"
                className={`${styles.chip}${
                  settings.startSide === 2 ? ` ${styles.chipOn}` : ""
                }`}
                onClick={() => setSetting("startSide", 2)}
              >
                {t.settingsStartSide2}
              </button>
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button className={styles.switchLink} onClick={switchUser}>
            {t.switchUser}
          </button>
          <button className={styles.doneBtn} onClick={() => navigate(-1)}>
            {t.settingsClose}
          </button>
        </div>
      </div>
    </div>
  );
}
