import { useRef } from "react";
import type { Session } from "../../types";
import { AllCards } from "./AllCards";
import { AddSection } from "./AddSection";

interface Props {
  session: Session;
  updateSession: (_updates: Partial<Session>) => void;
  onLearn: () => void;
}

export default function Main({
  session,
  updateSession,
  onLearn: _onLearn,
}: Props) {
  const notifyCardAdded = useRef<(() => void) | null>(null);

  return (
    <div id="app">
      <AddSection
        session={session}
        updateSession={updateSession}
        onCardAdded={() => notifyCardAdded.current?.()}
      />

      <AllCards
        session={session}
        onLearn={_onLearn}
        registerCardAddedNotifier={(fn) => { notifyCardAdded.current = fn; }}
      />
    </div>
  );
}
