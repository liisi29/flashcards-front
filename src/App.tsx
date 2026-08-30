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
import { SettingsPage } from "./views/settings/SettingsPage";
import { SubjectPage } from "./views/subject/SubjectPage";
import Header from "./components/Header";
import { SubjectsProvider } from "./contexts/SubjectsContext";
import { CardsProvider } from "./contexts/CardsContext";
import { TagsProvider } from "./contexts/TagsContext";
import { MobileMenuProvider } from "./contexts/MobileMenuContext";
import { GroupsProvider } from "./contexts/GroupsContext";
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

  return (
    <>
      {/* The welcome page has its own cute cycling loader — don't cover it */}
      {location.pathname !== "/" && <ServerSpinner />}
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
          element={<Main onLearn={() => navigate("/learn")} />}
        />
        <Route
          path="/learn"
          element={<Learn onExit={() => navigate("/add")} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/subject/:id" element={<SubjectPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <>
      <PasswordGate>
        <UserGate>
          <BrowserRouter>
            <SettingsProvider>
              <SubjectsProvider>
                <CurrentSubjectProvider>
                  <CardsProvider>
                    <TagsProvider>
                      <GroupsProvider>
                        <MobileMenuProvider>
                          <AppRoutes />
                        </MobileMenuProvider>
                      </GroupsProvider>
                    </TagsProvider>
                  </CardsProvider>
                </CurrentSubjectProvider>
              </SubjectsProvider>
            </SettingsProvider>
          </BrowserRouter>
        </UserGate>
      </PasswordGate>
    </>
  );
}
