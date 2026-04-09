import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import type { ISession } from "./types";
import { loadSession, saveSession } from "./session";
import Welcome from "./views/WelcomePage";
import Main from "./views/add/AddPage";
import { Learn } from "./views/learn/LearnPage";
import Header from "./components/Header";
import { SubjectsProvider } from "./contexts/SubjectsContext";
import PasswordGate from "./components/PasswordGate";
import { useState } from "react";

function AppRoutes() {
  const [session, setSession] = useState<ISession>(loadSession);
  const navigate = useNavigate();

  function updateSession(updates: Partial<ISession>) {
    const next = { ...session, ...updates };
    saveSession(next);
    setSession(next);
  }

  function handleEnterAdd(subjectId: string, topicId: string) {
    const next = { ...session, subjectId, topicId, topicIds: [topicId] };
    saveSession(next);
    setSession(next);
    navigate("/add");
  }

  function handleEnterLearn(subjectId: string, topicIds: string[]) {
    const topicId = topicIds.length === 1 ? topicIds[0] : "";
    const next = { ...session, subjectId, topicId, topicIds };
    saveSession(next);
    setSession(next);
    navigate("/learn");
  }

  return (
    <>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <Welcome
              onEnterAdd={handleEnterAdd}
              onEnterLearn={handleEnterLearn}
            />
          }
        />
        <Route
          path="/add"
          element={
            <Main
              session={session}
              updateSession={updateSession}
              onLearn={() => navigate("/learn")}
            />
          }
        />
        <Route
          path="/learn"
          element={<Learn session={session} onExit={() => navigate("/add")} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <PasswordGate>
      <BrowserRouter>
        <SubjectsProvider>
          <AppRoutes />
        </SubjectsProvider>
      </BrowserRouter>
    </PasswordGate>
  );
}
