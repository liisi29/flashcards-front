import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../../strings";
import { clearUser, currentUserId } from "../../user";
import { useUser } from "../../useUser";
import { GROUP_SIZES, type GroupSize } from "../../runtimeGroups";
import { useSettings } from "../../contexts/SettingsContext";
import { useCards } from "../../contexts/CardsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { useSubjects } from "../../contexts/SubjectsContext";
import { CardBgPicker } from "../../components/CardBgPicker";
import type { Color, ICard } from "../../types";
import styles from "./SettingsPage.module.css";

function cardColor(c: ICard): Color {
  const uid = currentUserId();
  return c.progress?.[uid] ?? c.progress?.["all"] ?? null;
}

const PROGRESS_COLORS: { key: string; label: string; dot: string }[] = [
  { key: "null", label: t.colorNull, dot: "#718096" },
  { key: "red", label: t.colorRed, dot: "#fc8181" },
  { key: "yellow", label: t.colorYellow, dot: "#f6e05e" },
  { key: "green", label: t.colorGreen, dot: "#68d391" },
];

/** Per-user preferences, synced to the server (userstate.settings) so they
    follow the person across devices. Reached from the name chip. */
export function SettingsPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { settings, loading, setSetting } = useSettings();
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
          {user && <span className={styles.who}>{user.label}</span>}
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
                  {PROGRESS_COLORS.map(({ key, label, dot }) => {
                    const n = counts[key];
                    const pct = total ? Math.round((n / total) * 100) : 0;
                    return (
                      <div key={key} className={styles.progressRow}>
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
                      </div>
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
            <h2>{t.groupSize}</h2>
            <p className={styles.hint}>{t.settingsGroupSizeHint}</p>
            <div className={styles.chips}>
              {GROUP_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`${styles.chip}${
                    settings.groupSize === s ? ` ${styles.chipOn}` : ""
                  }`}
                  onClick={() => setSetting("groupSize", s as GroupSize)}
                >
                  {s === 0 ? t.groupSizeOff : String(s)}
                </button>
              ))}
            </div>
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
