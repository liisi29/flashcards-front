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
  return (
    <div id="app">
      <AddSection session={session} updateSession={updateSession} />

      <AllCards session={session} onLearn={_onLearn} />
    </div>
  );
}
