import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentCard } from "../components/TournamentCard";
import { useTournaments } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { useAuth } from "../contexts/AuthContext";
import { usePopup } from "../contexts/PopupContext";
import { SquareKanban, Trophy, Plus, X, Search } from "lucide-react";
import {
  findTournamentByScorerPin,
  findTournamentByPin,
} from "../utils/pinCode";
import { usePermissionStore } from "../stores/permissionStore";
import { getAllSports } from "../config/sportsData";
import Loading from "../components/ui/Loading";
import "./HomePage.scss";

export function HomePage() {
  useTournaments(); // 開始監聽比賽列表

  const { tournaments, loading } = useTournamentStore();
  const { user, signInWithGoogle } = useAuth();
  const { showPopup, showConfirm } = usePopup();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showScorerPinModal, setShowScorerPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [scorerPinInput, setScorerPinInput] = useState("");
  const [scorerPinError, setScorerPinError] = useState("");
  const [scorerPinLoading, setScorerPinLoading] = useState(false);
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const grantScorePermission = usePermissionStore(
    (state) => state.grantScorePermission
  );

  const allSports = getAllSports();

  // 獲取當前用戶籌備中的比賽
  const myDraftTournaments = useMemo(() => {
    if (!user) return [];
    return tournaments.filter(
      (tournament) =>
        tournament.status === "draft" && tournament.organizerId === user.uid
    );
  }, [tournaments, user]);

  // 根據運動項目和搜尋關鍵字篩選比賽，顯示進行中的比賽和過去兩天已結束的比賽
  const filteredTournaments = useMemo(() => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

    // 過濾出進行中的比賽和過去兩天已結束的比賽
    let displayTournaments = tournaments.filter((tournament) => {
      if (tournament.status === "live") {
        return true;
      }
      if (tournament.status === "finished") {
        // 檢查是否在過去兩天內結束
        const finishedAt = (tournament as any).finishedAt;
        if (finishedAt) {
          const finishedTime = new Date(finishedAt).getTime();
          return finishedTime >= twoDaysAgo;
        }
      }
      return false;
    });

    // 根據搜尋關鍵字篩選
    if (searchQuery.trim()) {
      displayTournaments = displayTournaments.filter((tournament) =>
        tournament.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 再根據運動項目篩選
    if (selectedSportFilter === "all") {
      return displayTournaments;
    }
    return displayTournaments.filter(
      (tournament) => tournament.config.sportId === selectedSportFilter
    );
  }, [tournaments, selectedSportFilter, searchQuery]);

  const handleCreateTournament = async () => {
    if (!user) {
      // 未登入，提示登入
      showConfirm("需要登入才能創建賽事，是否立即登入？", async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error("Login failed:", error);
          showPopup("登入失敗，請重試", "error");
        }
      });
      return;
    }

    // 已登入，直接進入創建頁面
    navigate("/create");
  };

  const handleJoinWithPin = async () => {
    if (pinInput.length !== 6) {
      setPinError("PIN 碼必須是 6 位數");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      const tournament = await findTournamentByPin(pinInput);

      if (tournament) {
        // 檢查報名狀態
        if (tournament.status !== "draft") {
          setPinError("此比賽已不接受報名");
          return;
        }

        // 找到比賽，直接跳轉到詳情頁
        setShowPinModal(false);
        setPinInput("");
        navigate(`/tournament/${tournament.id}`);
      } else {
        setPinError("找不到此 PIN 碼，請確認後重試");
      }
    } catch (error) {
      console.error("Error validating PIN:", error);
      setPinError("驗證失敗，請重試");
    } finally {
      setPinLoading(false);
    }
  };

  const handleScorerPinLogin = async () => {
    if (scorerPinInput.length !== 6) {
      setScorerPinError("計分 PIN 必須是 6 位數");
      return;
    }

    setScorerPinLoading(true);
    setScorerPinError("");

    try {
      const tournament = await findTournamentByScorerPin(scorerPinInput);

      if (tournament) {
        // 授予計分權限
        grantScorePermission(tournament.id, scorerPinInput);

        // 導向比賽頁面
        navigate(`/tournament/${tournament.id}`);
        setShowScorerPinModal(false);
        setScorerPinInput("");
      } else {
        setScorerPinError("找不到此計分 PIN，請向主辦人確認");
      }
    } catch (error) {
      console.error("Error validating scorer PIN:", error);
      setScorerPinError("驗證失敗，請重試");
    } finally {
      setScorerPinLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* 主要操作區塊 */}
      <div className="home-page__hero">
        <div className="home-page__logo">
          <h1 className="home-page__logo-text">VsMatch</h1>
        </div>
        <div className="home-page__actions">
          {/* 創建賽事按鈕 */}
          <button
            onClick={handleCreateTournament}
            className="action-card action-card--create"
          >
            <div className="action-card__icon">
              <Plus size={24} color="white" />
            </div>
            <div className="action-card__content">
              <h2 className="action-card__title">創建賽事</h2>
              <p className="action-card__desc">建立並管理你的比賽</p>
            </div>
          </button>

          {/* 報名 PIN 按鈕 */}
          <button
            onClick={() => setShowPinModal(true)}
            className="action-card action-card--join"
          >
            <div className="action-card__icon action-card__icon--join">
              <Trophy size={24} color="#000000" />
            </div>
            <div className="action-card__content">
              <h2 className="action-card__title action-card__title--join">
                我要報名
              </h2>
              <p className="action-card__desc action-card__desc--join">
                輸入 PIN 碼查看比賽
              </p>
            </div>
          </button>

          {/* 計分 PIN 按鈕 */}
          <button
            onClick={() => setShowScorerPinModal(true)}
            className="action-card action-card--scorer"
          >
            <div className="action-card__icon action-card__icon--scorer">
              <SquareKanban size={24} color="#000000" />
            </div>
            <div className="action-card__content">
              <h2 className="action-card__title action-card__title--scorer">
                我要計分
              </h2>
              <p className="action-card__desc action-card__desc--scorer">
                志工計分員登入
              </p>
            </div>
          </button>
        </div>

        {/* 搜尋框 */}
        <div className="home-page__search">
          <Search size={20} className="home-page__search-icon" />
          <input
            type="text"
            placeholder="搜尋賽事名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="home-page__search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="home-page__search-clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 報名 PIN 碼輸入彈窗 */}
      {showPinModal && (
        <div className="pin-modal" onClick={() => setShowPinModal(false)}>
          <div
            className="pin-modal__content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pin-modal__close"
              onClick={() => {
                setShowPinModal(false);
                setPinInput("");
                setPinError("");
              }}
            >
              <X size={20} color="#6b7280" />
            </button>
            <input
              type="text"
              placeholder="輸入 6 位數 PIN 碼"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                setPinError("");
              }}
              className={`pin-modal__input ${
                pinError ? "pin-modal__input--error" : ""
              }`}
              maxLength={6}
              autoFocus
            />

            {pinError && <p className="pin-modal__error">{pinError}</p>}
            <button
              onClick={handleJoinWithPin}
              disabled={pinInput.length !== 6 || pinLoading}
              className="pin-modal__button"
            >
              {pinLoading ? "驗證中..." : "查看比賽"}
            </button>
          </div>
        </div>
      )}

      {/* 計分 PIN 碼輸入彈窗 */}
      {showScorerPinModal && (
        <div className="pin-modal" onClick={() => setShowScorerPinModal(false)}>
          <div
            className="pin-modal__content pin-modal__content--scorer"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pin-modal__close"
              onClick={() => {
                setShowScorerPinModal(false);
                setScorerPinInput("");
                setScorerPinError("");
              }}
            >
              <X size={24} color="#6b7280" />
            </button>
            <input
              type="text"
              placeholder="計分 PIN 碼"
              value={scorerPinInput}
              onChange={(e) => {
                setScorerPinInput(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                );
                setScorerPinError("");
              }}
              className={`pin-modal__input ${
                scorerPinError ? "pin-modal__input--error" : ""
              }`}
              maxLength={6}
              autoFocus
            />
            {scorerPinError && (
              <p className="pin-modal__error">{scorerPinError}</p>
            )}
            <button
              onClick={handleScorerPinLogin}
              disabled={scorerPinInput.length !== 6 || scorerPinLoading}
              className="pin-modal__button pin-modal__button--scorer"
            >
              {scorerPinLoading ? "驗證中..." : "計分員登入"}
            </button>
          </div>
        </div>
      )}

      {/* 我籌備中的比賽 */}
      {user && myDraftTournaments.length > 0 && (
        <div className="home-page__draft-section">
          <h2 className="home-page__draft-title">最近發布</h2>
          <div className="home-page__draft-scroll">
            {myDraftTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </div>
      )}

      {/* 比賽列表 */}
      <div className="home-page__section">
        <div className="home-page__section-header">
          <h2 className="home-page__section-title">探索比賽</h2>

          {/* 運動項目篩選下拉選單 */}
          <select
            value={selectedSportFilter}
            onChange={(e) => setSelectedSportFilter(e.target.value)}
            className="home-page__sport-filter"
          >
            <option value="all">全部運動</option>
            {allSports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading fullScreen text="載入中..." />
        ) : tournaments.length === 0 ? (
          <div className="home-page__empty">
            <p className="home-page__empty-text">目前沒有比賽</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="home-page__empty">
            <p className="home-page__empty-text">找不到符合的比賽</p>
          </div>
        ) : (
          <div className="home-page__grid">
            {filteredTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
