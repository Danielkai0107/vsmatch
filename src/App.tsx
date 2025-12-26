import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { PopupProvider } from './contexts/PopupContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { CreateTournamentPage } from './pages/CreateTournamentPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { EditTournamentPage } from './pages/EditTournamentPage';
import { ManageTournamentPage } from './pages/ManageTournamentPage';
import { ScorerAuthPage } from './pages/ScorerAuthPage';
import { JoinPage } from './pages/JoinPage';
import { ScorePage } from './pages/ScorePage';
import { MatchViewPage } from './pages/MatchViewPage';
import { ProfilePage } from './pages/ProfilePage';

// 切換路由時自動滾動到頂部
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="create" element={<CreateTournamentPage />} />
              <Route path="tournament/:id" element={<TournamentDetailPage />} />
              <Route path="tournament/:id/edit" element={<EditTournamentPage />} />
              <Route path="tournament/:id/manage" element={<ManageTournamentPage />} />
              <Route path="tournament/:id/scorer" element={<ScorerAuthPage />} />
              <Route path="join" element={<JoinPage />} />
              <Route path="score/:tournamentId/:matchId" element={<ScorePage />} />
              <Route path="match/:tournamentId/:matchId" element={<MatchViewPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </PopupProvider>
    </AuthProvider>
  );
}

export default App;
