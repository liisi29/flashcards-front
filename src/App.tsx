import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Welcome from "./views/WelcomePage";
import Main from "./views/add/AddPage";
import { Learn } from "./views/learn/LearnPage";
import { Pimekiri } from "./views/pimekiri/PimekiriPage";
import { SettingsPage } from "./views/settings/SettingsPage";
import { SubjectPage } from "./views/subject/SubjectPage";
import { SharePage } from "./views/share/SharePage";
import Header from "./components/Header";
import { SubjectsProvider } from "./contexts/SubjectsContext";
import { CardsProvider } from "./contexts/CardsContext";
import { TagsProvider } from "./contexts/TagsContext";
import { MobileMenuProvider } from "./contexts/MobileMenuContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { CurrentSubjectProvider } from "./contexts/CurrentSubjectContext";
import PasswordGate from "./components/PasswordGate";
import UserGate from "./components/UserGate";
import { ServerSpinner } from "./components/ServerSpinner";

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleEnterAdd() {
    navigate("/add");
  }

  function handleEnterLearn() {
    navigate("/learn");
  }

  function handleEnterPimekiri() {
    navigate("/pimekiri");
  }

  return (
    <>
      {/* The welcome page has its own cute cycling loader, and Pimekiri
          talks to no server at all — don't cover either. */}
      {location.pathname !== "/" && location.pathname !== "/pimekiri" && (
        <ServerSpinner />
      )}
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <Welcome
              onEnterAdd={handleEnterAdd}
              onEnterLearn={handleEnterLearn}
              onEnterPimekiri={handleEnterPimekiri}
            />
          }
        />
        <Route
          path="/add"
          element={<Main onLearn={() => navigate("/learn")} />}
        />
        <Route
          path="/learn"
          element={<Learn onExit={() => navigate("/add")} />}
        />
        <Route
          path="/pimekiri"
          element={<Pimekiri onExit={() => navigate("/")} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subject/:id" element={<SubjectPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function GatedApp() {
  return (
    <PasswordGate>
      <UserGate>
        <SettingsProvider>
          <SubjectsProvider>
            <CurrentSubjectProvider>
              <CardsProvider>
                <TagsProvider>
                  <MobileMenuProvider>
                    <AppRoutes />
                  </MobileMenuProvider>
                </TagsProvider>
              </CardsProvider>
            </CurrentSubjectProvider>
          </SubjectsProvider>
        </SettingsProvider>
      </UserGate>
    </PasswordGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public, read-only — no password/user gate, no shared data providers */}
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="/*" element={<GatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}
