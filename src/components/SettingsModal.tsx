import { t } from "../strings";
import { clearUser } from "../user";
import { GROUP_SIZES, setGroupSize, type GroupSize } from "../runtimeGroups";
import { useGroupSize } from "../useGroupSize";
import { CardBgPicker } from "./CardBgPicker";
import styles from "./SettingsModal.module.css";

/** Personal settings, opened from the user chip in the header:
    card background, runtime-group size, and switching user. */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const groupSize = useGroupSize();

  function switchUser() {
    onClose();
    clearUser(); // re-shows the UserGate picker
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{t.settingsHeading}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.section}>
          <h3>{t.cardBg}</h3>
          <CardBgPicker />
        </div>

        <div className={styles.section}>
          <h3>{t.groupSize}</h3>
          <select
            className={styles.select}
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value) as GroupSize)}
          >
            {GROUP_SIZES.map((s) => (
              <option key={s} value={s}>
                {s === 0 ? t.groupSizeOff : t.groupSizeN(s)}
              </option>
            ))}
          </select>
        </div>

        <button className={styles.switchLink} onClick={switchUser}>
          {t.switchUser}
        </button>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>
            {t.settingsClose}
          </button>
        </div>
      </div>
    </div>
  );
}
