import { useNavigate } from "react-router-dom";
import { t } from "../../strings";
import { clearUser } from "../../user";
import { useUser } from "../../useUser";
import { GROUP_SIZES, type GroupSize } from "../../runtimeGroups";
import { useSettings } from "../../contexts/SettingsContext";
import { CardBgPicker } from "../../components/CardBgPicker";
import styles from "./SettingsPage.module.css";

/** Per-user preferences, synced to the server (userstate.settings) so they
    follow the person across devices. Reached from the name chip. */
export function SettingsPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { settings, loading, setSetting } = useSettings();

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

        <section className={styles.section}>
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
