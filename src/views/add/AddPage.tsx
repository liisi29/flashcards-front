import { useRef } from "react";
import type { ISession } from "../../types";
import { AllCards } from "./allCards/AllCards";
import { AddSection } from "./AddSection";
import { BulkAddSection } from "./BulkAddSection";
import { Collapsible } from "../../components/Collapsible";
import { t } from "../../strings";
import styles from "./AddPage.module.css";

interface Props {
  session: ISession;
  updateSession: (_updates: Partial<ISession>) => void;
  onLearn: () => void;
}

export default function Main({
  session,
  updateSession,
  onLearn: _onLearn,
}: Props) {
  const notifyCardAdded = useRef<(() => void) | null>(null);
  const notify = () => notifyCardAdded.current?.();

  return (
    <div id="app">
      <div className={styles.addRow}>
        <Collapsible title={t.headingAddCard} storageKey="add-single">
          <AddSection
            session={session}
            updateSession={updateSession}
            onCardAdded={notify}
          />
        </Collapsible>

        <Collapsible title={t.headingBulk} storageKey="add-bulk">
          <BulkAddSection
            session={session}
            updateSession={updateSession}
            onCardAdded={notify}
          />
        </Collapsible>
      </div>

      <AllCards
        session={session}
        onLearn={_onLearn}
        registerCardAddedNotifier={(fn) => {
          notifyCardAdded.current = fn;
        }}
      />
    </div>
  );
}
