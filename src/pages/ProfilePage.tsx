import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTournaments } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { getSportById } from "../config/sportsData";
import { PinModal } from "../components/ui/PinModal";
import { ArrowLeft } from "lucide-react";
import "./ProfilePage.scss";

export function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  useTournaments();
  const { tournaments, loading } = useTournamentStore();
  
  // PIN 彈窗狀態
  const [selectedTournamentPins, setSelectedTournamentPins] = useState<{
    pin: string;
    scorerPin: string;
    tournamentId: string;
  } | null>(null);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-page__empty">
          <p>請先登入查看個人資料</p>
          <button
            onClick={() => navigate("/")}
            className="profile-page__back-btn"
          >
            <ArrowLeft />
          </button>
        </div>
      </div>
    );
  }

  // 我舉辦的比賽
  const myTournaments = tournaments.filter(
    (t) => t.organizerId === user.uid
  );

  // 我參加的比賽（檢查 players 列表）
  const joinedTournaments = tournaments.filter((t) =>
    t.players.some((p) => p.id === user.uid)
  );

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <div className="profile-page__user-info">
          {firebaseUser?.photoURL && (
            <img
              src={firebaseUser.photoURL}
              alt={user.displayName}
              className="profile-page__avatar"
            />
          )}
          <div className="profile-page__user-text">
            <h1 className="profile-page__username">{user.displayName}</h1>
            <p className="profile-page__email">{user.email}</p>
          </div>
        </div>

        <div className="profile-page__stats">
          <div className="profile-page__stat">
            <div className="profile-page__stat-value">{myTournaments.length}</div>
            <div className="profile-page__stat-label">舉辦比賽</div>
          </div>
          <div className="profile-page__stat">
            <div className="profile-page__stat-value">
              {joinedTournaments.length}
            </div>
            <div className="profile-page__stat-label">參加比賽</div>
          </div>
        </div>
      </div>

      {/* 我舉辦的比賽 */}
      <section className="profile-page__section">
        <h2 className="profile-page__section-title">我舉辦的比賽</h2>
        {loading ? (
          <div className="profile-page__loading">載入中...</div>
        ) : myTournaments.length === 0 ? (
          <div className="profile-page__empty-section">
            <p>還沒有舉辦過比賽</p>
            <Link to="/create" className="profile-page__create-btn">
              建立第一場比賽
            </Link>
          </div>
        ) : (
          <div className="profile-page__grid">
            {myTournaments.map((tournament) => {
              const sport = getSportById(tournament.config.sportId);
              return (
                <div key={tournament.id} className="tournament-item">
                  <div className="tournament-item__header">
                    <span className="tournament-item__icon">{sport?.icon}</span>
                    <span
                      className={`tournament-item__status tournament-item__status--${tournament.status}`}
                    >
                      {tournament.status === "draft"
                        ? "籌備中"
                        : tournament.status === "live"
                        ? "進行中"
                        : "已結束"}
                    </span>
                  </div>
                  <h3 className="tournament-item__name">{tournament.name}</h3>
                  <p className="tournament-item__info">
                    {sport?.name} • {tournament.players.length} 人報名
                  </p>
                  <div className="tournament-item__actions">
                    <button
                      onClick={() =>
                        setSelectedTournamentPins({
                          pin: tournament.pin,
                          scorerPin: tournament.scorerPin,
                          tournamentId: tournament.id,
                        })
                      }
                      className="tournament-item__btn tournament-item__btn--pin"
                    >
                      查看 PIN
                    </button>
                    <Link
                      to={`/tournament/${tournament.id}/manage`}
                      className="tournament-item__btn tournament-item__btn--manage"
                    >
                      管理
                    </Link>
                    <Link
                      to={`/tournament/${tournament.id}/edit`}
                      className="tournament-item__btn tournament-item__btn--edit"
                    >
                      編輯
                    </Link>
                    <Link
                      to={`/tournament/${tournament.id}`}
                      className="tournament-item__btn tournament-item__btn--view"
                    >
                      預覽
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 我參加的比賽 */}
      <section className="profile-page__section">
        <h2 className="profile-page__section-title">我參加的比賽</h2>
        {loading ? (
          <div className="profile-page__loading">載入中...</div>
        ) : joinedTournaments.length === 0 ? (
          <div className="profile-page__empty-section">
            <p>還沒有參加過比賽</p>
            <Link to="/" className="profile-page__link">
              前往首頁報名
            </Link>
          </div>
        ) : (
          <div className="profile-page__grid">
            {joinedTournaments.map((tournament) => {
              const sport = getSportById(tournament.config.sportId);
              return (
                <div key={tournament.id} className="tournament-item">
                  <div className="tournament-item__header">
                    <span className="tournament-item__icon">{sport?.icon}</span>
                    <span
                      className={`tournament-item__status tournament-item__status--${tournament.status}`}
                    >
                      {tournament.status === "draft"
                        ? "籌備中"
                        : tournament.status === "live"
                        ? "進行中"
                        : "已結束"}
                    </span>
                  </div>
                  <h3 className="tournament-item__name">{tournament.name}</h3>
                  <p className="tournament-item__info">
                    {sport?.name} • {tournament.players.length} 人報名
                  </p>
                  <div className="tournament-item__actions">
                    <Link
                      to={`/tournament/${tournament.id}`}
                      className="tournament-item__btn tournament-item__btn--view"
                    >
                      查看比賽
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* PIN 碼彈窗 */}
      {selectedTournamentPins && (
        <PinModal
          pin={selectedTournamentPins.pin}
          scorerPin={selectedTournamentPins.scorerPin}
          tournamentId={selectedTournamentPins.tournamentId}
          onClose={() => setSelectedTournamentPins(null)}
        />
      )}
    </div>
  );
}

