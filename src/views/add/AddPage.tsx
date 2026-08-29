import { useRef } from "react";
import { AllCards } from "./allCards/AllCards";
import { AddSection } from "./AddSection";
import { BulkAddSection } from "./BulkAddSection";
import { Collapsible } from "../../components/Collapsible";
import { t } from "../../strings";
import styles from "./AddPage.module.css";

interface Props {
  onLearn: () => void;
}

export default function Main({ onLearn }: Props) {
  const notifyCardAdded = useRef<(() => void) | null>(null);
  const notify = () => notifyCardAdded.current?.();

  return (
    <div id="app">
      <div className={styles.addWrap}>
        <Collapsible title={t.headingAdd} storageKey="add-forms">
          <div className={styles.addRow}>
            <div className={styles.addCol}>
              <h3 className={styles.colTitle}>{t.headingAddCard}</h3>
              <AddSection onCardAdded={notify} />
            </div>
            <div className={styles.addCol}>
              <h3 className={styles.colTitle}>{t.headingBulk}</h3>
              <BulkAddSection onCardAdded={notify} />
            </div>
          </div>
        </Collapsible>
      </div>

      <AllCards
        onLearn={onLearn}
        registerCardAddedNotifier={(fn) => {
          notifyCardAdded.current = fn;
        }}
      />
    </div>
  );
}
