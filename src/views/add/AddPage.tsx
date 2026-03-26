import { useRef } from "react";
import type { ISession } from "../../types";
import { AllCards } from "./AllCards";
import { AddSection } from "./AddSection";

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
        registerCardAddedNotifier={(fn) => {
          notifyCardAdded.current = fn;
        }}
      />
    </div>
  );
}
