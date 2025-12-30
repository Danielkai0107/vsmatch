import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTournaments } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { getSportById } from "../config/sportsData";
import Loading from "../components/ui/Loading";
import "./ProfilePage.scss";

export function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  useTournaments();
  const { tournaments, loading } = useTournamentStore();

  // Tabs 狀態
  const [activeTab, setActiveTab] = useState<"organized" | "joined">(
    "organized"
  );

  // 如果未登入，自動導航到首頁
  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // 滑動狀態
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 最小滑動距離（px）
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeTab === "organized") {
      setActiveTab("joined");
    }
    if (isRightSwipe && activeTab === "joined") {
      setActiveTab("organized");
    }
  };

  // 我舉辦的比賽
  const myTournaments = user
    ? tournaments.filter((t) => t.organizerId === user.uid)
    : [];

  // 我參加的比賽（檢查 players 列表中的 userId）
  const joinedTournaments = user
    ? tournaments.filter((t) =>
        t.players.some((p) => p.userId === user.uid || p.id === user.uid)
      )
    : [];

  // 如果沒有登入，不顯示任何內容（navbar 會隱藏 profile 按鈕）
  if (!user) {
    return null;
  }

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
            <div className="profile-page__stat-value">
              {myTournaments.length}
            </div>
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

      {/* Tabs 切換 */}
      <div className="profile-page__tabs">
        <button
          className={`profile-page__tab ${
            activeTab === "organized" ? "profile-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("organized")}
        >
          我的舉辦
          {/* <span className="profile-page__tab-count">
            {myTournaments.length}
          </span> */}
        </button>
        <button
          className={`profile-page__tab ${
            activeTab === "joined" ? "profile-page__tab--active" : ""
          }`}
          onClick={() => setActiveTab("joined")}
        >
          參賽紀錄
          {/* <span className="profile-page__tab-count">
            {joinedTournaments.length}
          </span> */}
        </button>
      </div>

      {/* 內容區域 - 支持滑動切換 */}
      <div
        className="profile-page__content"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* 我舉辦的比賽 */}
        {activeTab === "organized" && (
          <section className="profile-page__section">
            {loading ? (
              <Loading text="載入中..." />
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
                    <Link
                      key={tournament.id}
                      to={`/tournament/${tournament.id}`}
                      className="tournament-item"
                    >
                      <div className="tournament-item__header">
                        <div className="tournament-item__title-row">
                          <h3 className="tournament-item__name">
                            {tournament.name}
                          </h3>
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
                        <p className="tournament-item__info">
                          {sport?.name} • {tournament.players.length} 人報名
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 我參加的比賽 */}
        {activeTab === "joined" && (
          <section className="profile-page__section">
            {loading ? (
              <Loading text="載入中..." />
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
                  // 找到該使用者在此比賽中使用的暱稱
                  const myPlayerData = tournament.players.find(
                    (p) => p.userId === user.uid || p.id === user.uid
                  );
                  const myNickname = myPlayerData?.name || "未知";

                  return (
                    <Link
                      key={tournament.id}
                      to={`/tournament/${tournament.id}`}
                      className="tournament-item"
                    >
                      <div className="tournament-item__header">
                        <div className="tournament-item__title-row">
                          <h3 className="tournament-item__name">
                            {tournament.name}
                          </h3>
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
                        <p className="tournament-item__info">
                          {sport?.name} • {tournament.players.length} 人報名
                        </p>
                        <p className="tournament-item__nickname">
                          參賽名稱：{myNickname}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
