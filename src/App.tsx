import { useState } from "react";
import type { Session } from "./types";
import { loadSession, saveSession } from "./session";
import Welcome from "./views/WelcomePage";
import Main from "./views/add/AddPage";
import Learn from "./views/LearnPage";

type View = "welcome" | "main" | "learn";

export default function App() {
  const [session, setSession] = useState<Session>(loadSession);
  const [view, setView] = useState<View>(session.name ? "main" : "welcome");

  function updateSession(updates: Partial<Session>) {
    const next = { ...session, ...updates };
    saveSession(next);
    setSession(next);
  }

  function goMain(s: Session) {
    saveSession(s);
    setSession(s);
    setView("main");
  }

  if (view === "welcome") {
    return (
      <Welcome
        onEnterMain={(s) => goMain(s)}
        onEnterLearn={(s) => {
          goMain(s);
          setView("learn");
        }}
      />
    );
  }

  if (view === "learn") {
    return <Learn session={session} onExit={() => setView("main")} />;
  }

  return (
    <Main
      session={session}
      updateSession={updateSession}
      onChangeUser={() => setView("welcome")}
      onLearn={() => setView("learn")}
    />
  );
}
