import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { PopupProvider } from "./contexts/PopupContext";
import { Layout } from "./components/layout/Layout";
import Loading from "./components/ui/Loading";

// 路由懶加載 - 將頁面組件拆分成獨立的檔案，提升首次載入速度
const HomePage = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage }))
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const CreateTournamentPage = lazy(() =>
  import("./pages/CreateTournamentPage").then((m) => ({
    default: m.CreateTournamentPage,
  }))
);
const TournamentDetailPage = lazy(() =>
  import("./pages/TournamentDetailPage").then((m) => ({
    default: m.TournamentDetailPage,
  }))
);
const EditTournamentPage = lazy(() =>
  import("./pages/EditTournamentPage").then((m) => ({
    default: m.EditTournamentPage,
  }))
);
const ManageTournamentPage = lazy(() =>
  import("./pages/ManageTournamentPage").then((m) => ({
    default: m.ManageTournamentPage,
  }))
);
const ScorerAuthPage = lazy(() =>
  import("./pages/ScorerAuthPage").then((m) => ({ default: m.ScorerAuthPage }))
);
const JoinPage = lazy(() =>
  import("./pages/JoinPage").then((m) => ({ default: m.JoinPage }))
);
const ScorePage = lazy(() =>
  import("./pages/ScorePage").then((m) => ({ default: m.ScorePage }))
);
const MatchViewPage = lazy(() =>
  import("./pages/MatchViewPage").then((m) => ({ default: m.MatchViewPage }))
);

// 切換路由時自動滾動到頂部
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 由於我們的滾動容器是 .layout 而不是 window
    const layoutElement = document.querySelector(".layout");
    if (layoutElement) {
      layoutElement.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<Loading fullScreen text="載入中..." />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="create" element={<CreateTournamentPage />} />
                <Route
                  path="tournament/:id/edit"
                  element={<EditTournamentPage />}
                />
                <Route
                  path="tournament/:id/manage"
                  element={<ManageTournamentPage />}
                />
                <Route
                  path="tournament/:id/scorer"
                  element={<ScorerAuthPage />}
                />
                <Route path="join" element={<JoinPage />} />
                <Route
                  path="score/:tournamentId/:matchId"
                  element={<ScorePage />}
                />
                <Route
                  path="match/:tournamentId/:matchId"
                  element={<MatchViewPage />}
                />
              </Route>
              <Route path="tournament/:id" element={<TournamentDetailPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PopupProvider>
    </AuthProvider>
  );
}

export default App;
