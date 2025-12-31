import { useState, useEffect, useMemo, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  useMyOrganizedTournaments,
  useMyJoinedTournaments,
} from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { getSportById } from "../config/sportsData";
import { useCountdown } from "../hooks/useCountdown";
import Loading from "../components/ui/Loading";
import type { Tournament } from "../types";
import "./ProfilePage.scss";

export function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();

  // 同時查詢舉辦的和參加的比賽
  useMyOrganizedTournaments(user?.uid);
  useMyJoinedTournaments(user?.uid);
  const tournaments = useTournamentStore((state) => state.tournaments);
  const loading = useTournamentStore((state) => state.loading);

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
  const [isSwiping, setIsSwiping] = useState(false);

  // 最小滑動距離（px）
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    // 🚀 判斷是否為滑動（移動距離超過閾值）
    if (touchStart && Math.abs(e.targetTouches[0].clientX - touchStart) > 10) {
      setIsSwiping(true);
    }
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
    
    // 重置狀態
    setTimeout(() => setIsSwiping(false), 50);
  };

  // 我舉辦的比賽（過濾出 organizerId 等於當前用戶 ID 的比賽）
  const myTournaments = useMemo(
    () =>
      user ? tournaments.filter((t) => t.organizerId === user.uid) : [],
    [tournaments, user?.uid]
  );

  // 我參加的比賽（檢查 players 列表中的 userId）
  const joinedTournaments = useMemo(
    () =>
      user
        ? tournaments.filter((t) =>
            t.players.some((p) => p.userId === user.uid || p.id === user.uid)
          )
        : [],
    [tournaments, user?.uid]
  );

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

      {/* Tabs 切換 - 🚀 支持滑動和點擊 */}
      <div 
        className="profile-page__tabs"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          className={`profile-page__tab ${
            activeTab === "organized" ? "profile-page__tab--active" : ""
          }`}
          onClick={(e) => {
            // 🚀 如果正在滑動，不觸發點擊
            if (isSwiping) {
              e.preventDefault();
              return;
            }
            setActiveTab("organized");
          }}
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
          onClick={(e) => {
            // 🚀 如果正在滑動，不觸發點擊
            if (isSwiping) {
              e.preventDefault();
              return;
            }
            setActiveTab("joined");
          }}
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
              </div>
            ) : (
              <div className="profile-page__grid">
                {myTournaments.map((tournament) => (
                  <TournamentItemWithCountdown
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
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
              </div>
            ) : (
              <div className="profile-page__grid">
                {joinedTournaments.map((tournament) => (
                  <TournamentItemWithCountdown
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

// 🚀 優化：將組件移出外部並使用 memo，避免因為 ProfilePage 重新渲染導致組件不斷被重新定義與掛載
const TournamentItemWithCountdown = memo(
  ({ tournament }: { tournament: Tournament }) => {
    const sport = getSportById(tournament.config.sportId);
    const { timeLeft, isExpired } = useCountdown(tournament, false);

    // 如果已過期，禁用點擊
    const handleClick = (e: React.MouseEvent) => {
      if (tournament.status === "draft" && isExpired) {
        e.preventDefault();
      }
    };

    return (
      <Link
        to={`/tournament/${tournament.id}`}
        className={`tournament-item ${
          tournament.status === "draft" && isExpired
            ? "tournament-item--expired"
            : ""
        }`}
        onClick={handleClick}
      >
        <div className="tournament-item__header">
          <div className="tournament-item__title-row">
            <h3 className="tournament-item__name">{tournament.name}</h3>
            {tournament.status === "draft" && !isExpired && (
              <span className="tournament-item__countdown">{timeLeft}</span>
            )}
            {tournament.status === "draft" && isExpired && (
              <span className="tournament-item__countdown tournament-item__countdown--expired">
                已過期
              </span>
            )}
            {tournament.status !== "draft" && (
              <span
                className={`tournament-item__status tournament-item__status--${tournament.status}`}
              >
                {tournament.status === "live" ? "進行中" : "已結束"}
              </span>
            )}
          </div>
          <p className="tournament-item__info">
            <span>{sport?.name}</span>
            <span>{tournament.players.length} 人報名</span>
          </p>
        </div>
      </Link>
    );
  }
);
