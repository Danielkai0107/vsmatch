import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentCard } from "../components/TournamentCard";
import {
  useActiveTournaments,
  useMyDraftTournaments,
  useMyJoinedTournaments,
} from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { useAuth } from "../contexts/AuthContext";
import { usePopup } from "../contexts/PopupContext";
import {
  SquareKanban,
  Trophy,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  findTournamentByScorerPin,
  findTournamentByPin,
} from "../utils/pinCode";
import { usePermissionStore } from "../stores/permissionStore";
import { getAllSports } from "../config/sportsData";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import Loading from "../components/ui/Loading";
import "./HomePage.scss";

export function HomePage() {
  const { user, signInWithGoogle } = useAuth();

  // 使用優化後的查詢：只抓取活躍的比賽
  useActiveTournaments();
  // 如果用戶已登入，額外抓取其籌備中的比賽和參加的比賽
  useMyDraftTournaments(user?.uid);
  useMyJoinedTournaments(user?.uid);

  // 使用 selector 避免不必要的重新渲染
  const tournaments = useTournamentStore((state) => state.tournaments);
  const loading = useTournamentStore((state) => state.loading);
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

  // 籌備中（最近發布）的滾動狀態
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const draftScrollRef = useRef<HTMLDivElement>(null);

  // 我的比賽的滾動狀態
  const [showJoinedLeftArrow, setShowJoinedLeftArrow] = useState(false);
  const [showJoinedRightArrow, setShowJoinedRightArrow] = useState(false);
  const joinedScrollRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const grantScorePermission = usePermissionStore(
    (state) => state.grantScorePermission
  );
  const grantJoinPermission = usePermissionStore(
    (state) => state.grantJoinPermission
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

  // 獲取當前用戶參加的比賽（尚未開始或進行中）
  const myParticipatedTournaments = useMemo(() => {
    if (!user) return [];
    return tournaments.filter((tournament) => {
      // 排除已結束的比賽，且用戶是參賽選手
      const isNotFinished = tournament.status !== "finished";
      const isParticipant = tournament.players?.some(
        (p) => p.userId === user.uid || p.id === user.uid
      );
      return isNotFinished && isParticipant;
    });
  }, [tournaments, user]);

  // 檢查滾動位置，顯示/隱藏箭頭
  const checkScroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    setLeft: (show: boolean) => void,
    setRight: (show: boolean) => void
  ) => {
    const element = ref.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    setLeft(scrollLeft > 0);
    setRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const draftElement = draftScrollRef.current;
    const joinedElement = joinedScrollRef.current;

    const handleScroll = () => {
      checkScroll(draftScrollRef, setShowLeftArrow, setShowRightArrow);
      checkScroll(
        joinedScrollRef,
        setShowJoinedLeftArrow,
        setShowJoinedRightArrow
      );
    };

    if (draftElement) {
      checkScroll(draftScrollRef, setShowLeftArrow, setShowRightArrow);
      draftElement.addEventListener("scroll", handleScroll);
    }
    if (joinedElement) {
      checkScroll(
        joinedScrollRef,
        setShowJoinedLeftArrow,
        setShowJoinedRightArrow
      );
      joinedElement.addEventListener("scroll", handleScroll);
    }

    window.addEventListener("resize", handleScroll);

    return () => {
      if (draftElement)
        draftElement.removeEventListener("scroll", handleScroll);
      if (joinedElement)
        joinedElement.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [myDraftTournaments, myParticipatedTournaments]);

  // 🚀 使用 ref 追蹤正在刪除的比賽 ID，避免重複刪除
  const deletingTournamentsRef = useRef<Set<string>>(new Set());

  // 自動刪除過期的比賽
  const checkExpiredTournaments = useCallback(async () => {
    const COUNTDOWN_DURATION = 10 * 60 * 1000; // 10分鐘
    const draftTournaments = tournaments.filter((t) => t.status === "draft");
    const now = Date.now();

    for (const tournament of draftTournaments) {
      // 🚀 如果正在刪除，跳過
      if (deletingTournamentsRef.current.has(tournament.id)) {
        continue;
      }

      const createdAt = tournament.createdAt;
      const createdTime =
        createdAt instanceof Date
          ? createdAt.getTime()
          : new Date(createdAt).getTime();
      const elapsed = now - createdTime;

      // 如果已過期
      if (elapsed >= COUNTDOWN_DURATION) {
        // 🚀 標記為正在刪除
        deletingTournamentsRef.current.add(tournament.id);

        console.log(`自動刪除過期比賽: ${tournament.id} (${tournament.name})`);

        try {
          // 1. 刪除所有 matches 子集合
          const matchesRef = collection(
            db,
            "tournaments",
            tournament.id,
            "matches"
          );
          const matchesSnapshot = await getDocs(matchesRef);
          const deleteMatchPromises = matchesSnapshot.docs.map((doc) =>
            deleteDoc(doc.ref)
          );
          await Promise.all(deleteMatchPromises);

          // 2. 刪除比賽本身
          await deleteDoc(doc(db, "tournaments", tournament.id));

          console.log(`比賽 ${tournament.id} 已自動刪除`);
        } catch (error) {
          console.error(`自動刪除比賽 ${tournament.id} 失敗:`, error);
          // 🚀 刪除失敗，從集合中移除，允許重試
          deletingTournamentsRef.current.delete(tournament.id);
        }
      }
    }
  }, [tournaments]);

  useEffect(() => {
    // 每30秒檢查一次
    const interval = setInterval(checkExpiredTournaments, 30000);
    // 立即檢查一次
    checkExpiredTournaments();

    return () => clearInterval(interval);
  }, [checkExpiredTournaments]);

  // 滾動函數
  const scroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: "left" | "right"
  ) => {
    const element = ref.current;
    if (!element) return;

    const scrollAmount = 380; // 卡片寬度 + gap
    const newScrollLeft =
      direction === "left"
        ? element.scrollLeft - scrollAmount
        : element.scrollLeft + scrollAmount;

    element.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    });
  };

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

        // 授予報名權限
        grantJoinPermission(tournament.id);

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

      {/* 最近發布的比賽 */}
      {user && (
        <div className="home-page__draft-section">
          <h2 className="home-page__draft-title">最近發布</h2>
          <div className="home-page__draft-container">
            {myDraftTournaments.length > 0 ? (
              <>
                {showLeftArrow && (
                  <button
                    className="home-page__scroll-btn home-page__scroll-btn--left"
                    onClick={() => scroll(draftScrollRef, "left")}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div className="home-page__draft-scroll" ref={draftScrollRef}>
                  {myDraftTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                    />
                  ))}
                </div>
                {showRightArrow && (
                  <button
                    className="home-page__scroll-btn home-page__scroll-btn--right"
                    onClick={() => scroll(draftScrollRef, "right")}
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </>
            ) : (
              <div className="home-page__empty-simple">
                <p>暫無發布</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 我參加的比賽 */}
      {user && (
        <div className="home-page__draft-section home-page__draft-section--joined">
          <h2 className="home-page__draft-title">參賽中</h2>
          <div className="home-page__draft-container">
            {myParticipatedTournaments.length > 0 ? (
              <>
                {showJoinedLeftArrow && (
                  <button
                    className="home-page__scroll-btn home-page__scroll-btn--left"
                    onClick={() => scroll(joinedScrollRef, "left")}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div className="home-page__draft-scroll" ref={joinedScrollRef}>
                  {myParticipatedTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                    />
                  ))}
                </div>
                {showJoinedRightArrow && (
                  <button
                    className="home-page__scroll-btn home-page__scroll-btn--right"
                    onClick={() => scroll(joinedScrollRef, "right")}
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </>
            ) : (
              <div className="home-page__empty-simple">
                <p>目前沒有參加中的比賽</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 比賽列表 */}
      <div className="home-page__section">
        <div className="home-page__section-header">
          <h2 className="home-page__section-title">觀看比賽</h2>

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
