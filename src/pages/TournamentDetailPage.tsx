import { useState, useEffect, useMemo, useRef } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useTournamentById, useMatches } from "../hooks/useFirestore";
import { useTournamentStore } from "../stores/tournamentStore";
import { useMatchStore } from "../stores/matchStore";
import { BracketView } from "../components/bracket/BracketView";
import { PinModal } from "../components/ui/PinModal";
import { JoinModal } from "../components/ui/JoinModal";
import { getFormatById, getSportById } from "../config/sportsData";
import { mapPlayersToMatches } from "../utils/bracketLogic";
import { processAllByes } from "../utils/progressionLogic";
import { useAuth } from "../contexts/AuthContext";
import { usePopup } from "../contexts/PopupContext";
import type { Match } from "../types";
import { getSetsFormatLabel } from "../types";
import { ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Loading from "../components/ui/Loading";
import { useCountdown } from "../hooks/useCountdown";
import { usePermissionStore } from "../stores/permissionStore";
import "./TournamentDetailPage.scss";

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showPopup, showConfirm } = usePopup();
  const joinPermissions = usePermissionStore((state) => state.joinPermissions);
  const hasJoinPermission = id ? !!joinPermissions[id] : false;

  const grantJoinPermission = usePermissionStore(
    (state) => state.grantJoinPermission
  );
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showJoinPinModal, setShowJoinPinModal] = useState(false);
  const [joinPinInput, setJoinPinInput] = useState("");
  const [joinPinError, setJoinPinError] = useState("");

  // 🚀 優化：先從 store 獲取已有的比賽資料（來自首頁/個人頁）
  const tournaments = useTournamentStore((state) => state.tournaments);
  const preloadedTournament = useMemo(
    () => tournaments.find((t) => t.id === id),
    [tournaments, id]
  );

  // 然後再訂閱即時更新
  useTournamentById(id);
  useMatches(id);

  const { currentTournament: liveTournament, loading } = useTournamentStore();
  const { matches, loading: matchesLoading } = useMatchStore();

  // 🚀 優化：優先使用即時資料，否則使用預載入的資料（避免閃爍）
  const currentTournament = liveTournament || preloadedTournament;

  const [isFixing, setIsFixing] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [hasAttemptedMatchesLoad, setHasAttemptedMatchesLoad] = useState(false);
  const hasAutoGrantedRef = useRef(false); // 追蹤是否已自動授權過
  const pinFromUrl = searchParams.get("pin");

  // 🚀 自動授權邏輯：如果 URL 中有正確的 PIN，自動授予報名權限
  useEffect(() => {
    // 只在尚未授權過且有 ID 的情況下執行
    if (!id || hasAutoGrantedRef.current || hasJoinPermission || !pinFromUrl)
      return;

    if (currentTournament && pinFromUrl === currentTournament.pin) {
      hasAutoGrantedRef.current = true; // 標記已授權，避免重複

      // 延遲執行以避免在渲染過程中觸發狀態更新
      const timer = setTimeout(() => {
        grantJoinPermission(currentTournament.id);
        showPopup("已透過連結獲得報名資格", "success");
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [
    id,
    currentTournament?.id,
    currentTournament?.pin,
    pinFromUrl,
    hasJoinPermission,
    grantJoinPermission,
    showPopup,
  ]);

  // 追踪載入狀態：只有在真正載入過後才標記為已嘗試
  useEffect(() => {
    if (loading) {
      setHasAttemptedLoad(false);
    } else if (id) {
      // loading 從 true 變成 false 時，標記為已嘗試載入
      setHasAttemptedLoad(true);
    }
  }, [loading, id]);

  // 追踪 matches 載入狀態：確保至少嘗試載入過一次
  useEffect(() => {
    if (matchesLoading) {
      // 只要曾經進入載入狀態，就標記為已嘗試
      setHasAttemptedMatchesLoad(true);
    }
  }, [matchesLoading]);

  // 自動返回首頁：如果找不到比賽（只有在真正嘗試載入後才執行）
  useEffect(() => {
    if (hasAttemptedLoad && !loading && !currentTournament && id) {
      console.log("找不到比賽，自動返回首頁");
      // 先導航到首頁
      navigate("/", { replace: true });
      // 然後顯示提示訊息
      setTimeout(() => {
        showPopup("找不到此比賽", "error");
      }, 100);
    }
  }, [hasAttemptedLoad, loading, currentTournament, id, navigate, showPopup]);

  // 自動關閉計分面板：如果比賽已完成
  useEffect(() => {
    if (currentTournament?.status === "finished" && showPinModal) {
      console.log("比賽已完成，自動關閉計分面板");
      setShowPinModal(false);
      showPopup("比賽已結束", "info");
    }
  }, [currentTournament?.status, showPinModal, showPopup]);

  // 自動修復：如果比賽已開始但沒有 matches，自動創建
  useEffect(() => {
    const fixMissingMatches = async () => {
      if (!id || !currentTournament || isFixing) return;

      // 【重要】只在 matches 真正載入完成後才檢查，避免時序競爭問題
      // 1. matchesLoading 必須是 false（當前沒有在載入）
      // 2. hasAttemptedMatchesLoad 必須是 true（至少嘗試載入過一次）
      if (matchesLoading || !hasAttemptedMatchesLoad) return;

      // 只處理已開始但沒有 matches 的情況
      if (
        currentTournament.status === "live" &&
        Object.keys(matches).length === 0
      ) {
        console.log("檢測到比賽已開始但缺少 matches，開始自動修復...");
        setIsFixing(true);

        try {
          const format = getFormatById(currentTournament.config.formatId);
          if (!format) {
            console.error("找不到比賽格式");
            setIsFixing(false);
            return;
          }

          const initialMatches = mapPlayersToMatches(
            format,
            currentTournament.players
          );

          // 將每場比賽保存到 Firestore
          const savePromises = Object.entries(initialMatches).map(
            ([matchId, match]) => {
              const matchRef = doc(db, "tournaments", id, "matches", matchId);
              return setDoc(matchRef, {
                ...match,
                matchId,
                tournamentId: id,
              });
            }
          );

          await Promise.all(savePromises);
          console.log("Matches 創建成功");

          // 處理輪空
          try {
            await processAllByes(
              id,
              initialMatches as Record<string, Match>,
              format
            );
            console.log("輪空處理完成");
          } catch (error) {
            console.error("處理輪空時發生錯誤:", error);
          }

          // 等待一下讓 Firestore 監聽器更新
          setTimeout(() => {
            setIsFixing(false);
          }, 1000);
        } catch (error) {
          console.error("自動修復失敗:", error);
          setIsFixing(false);
        }
      }
    };

    fixMissingMatches();
  }, [
    id,
    currentTournament,
    matches,
    isFixing,
    matchesLoading,
    hasAttemptedMatchesLoad,
  ]);

  // 🔧 重要：所有 Hooks 必須在任何條件 return 之前調用
  // 檢查是否為舉辦者
  const isOrganizer = user?.uid === currentTournament?.organizerId;

  // 倒數計時（僅在 draft 狀態且是舉辦者時自動刪除）
  const { timeLeft, isExpired } = useCountdown(
    currentTournament || null,
    isOrganizer && currentTournament?.status === "draft"
  );

  // 🚀 優化：只在真正沒有任何資料時才顯示全屏 loading
  // 如果有預載入的資料，先顯示內容，讓對戰表區域單獨 loading
  const showFullScreenLoading = (loading || isFixing) && !preloadedTournament;

  if (showFullScreenLoading) {
    return (
      <Loading
        fullScreen
        text={isFixing ? "正在初始化對戰表..." : "載入中..."}
      />
    );
  }

  // 如果找不到比賽，返回 null（useEffect 會自動導航到首頁）
  if (!currentTournament) {
    return null;
  }

  const format = getFormatById(currentTournament.config.formatId);
  const sport = getSportById(currentTournament.config.sportId);

  // 檢查當前使用者是否已報名
  const hasJoined = user
    ? currentTournament.players.some(
        (p) => p.userId === user.uid || p.id === user.uid
      )
    : false;

  // 處理刪除比賽
  const handleDeleteTournament = async () => {
    if (!id || !currentTournament) return;

    showConfirm(
      `確定要刪除比賽「${currentTournament.name}」嗎？\n\n此操作無法復原，將會刪除：\n• 比賽資料\n• 所有參賽者資料\n• 所有場次資料`,
      async () => {
        setIsDeleting(true);
        try {
          // 1. 刪除所有 matches 子集合
          const matchesRef = collection(db, "tournaments", id, "matches");
          const matchesSnapshot = await getDocs(matchesRef);
          const deleteMatchPromises = matchesSnapshot.docs.map((doc) =>
            deleteDoc(doc.ref)
          );
          await Promise.all(deleteMatchPromises);
          console.log("已刪除所有場次");

          // 2. 刪除比賽本身
          await deleteDoc(doc(db, "tournaments", id));
          console.log("已刪除比賽");

          showPopup("比賽已成功刪除", "success");
          navigate("/");
        } catch (error) {
          console.error("刪除比賽失敗:", error);
          showPopup("刪除比賽失敗，請稍後再試", "error");
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  // 處理開始比賽
  const handleStartTournament = async () => {
    if (!id || !currentTournament) return;

    // 檢查是否至少有2個玩家
    if (currentPlayersCount < 2) {
      alert("至少需要2位參賽者才能開始比賽！");
      return;
    }

    try {
      setIsStarting(true);

      // 生成對戰表
      const format = getFormatById(currentTournament.config.formatId);
      if (!format) {
        alert("找不到比賽格式");
        setIsStarting(false);
        return;
      }

      // 報隊制 (KOTH) 特殊初始化邏輯
      if (format.type === "koth") {
        const players = [...currentTournament.players];
        const p1 = players[0];
        const p2 = players[1];
        const queue = players.slice(2).map((p) => p.name);

        const initialMatch: Partial<Match> = {
          matchId: "koth_match",
          tournamentId: id,
          player1: { name: p1.name },
          player2: { name: p2.name },
          sets: [],
          currentSet: 0,
          winner: null,
          status: "pending",
          nextMatchId: null,
        };

        await setDoc(
          doc(db, "tournaments", id, "matches", "koth_match"),
          initialMatch
        );

        await updateDoc(doc(db, "tournaments", id), {
          status: "live",
          startedAt: new Date().toISOString(),
          kothQueue: queue,
          kothStats: {},
        });

        console.log("KOTH 比賽初始化成功");
        return;
      }

      const initialMatches = mapPlayersToMatches(
        format,
        currentTournament.players
      );

      // 將每場比賽保存到 Firestore 的 matches 子集合
      const savePromises = Object.entries(initialMatches).map(
        ([matchId, match]) => {
          const matchRef = doc(db, "tournaments", id, "matches", matchId);
          return setDoc(matchRef, {
            ...match,
            matchId,
            tournamentId: id,
          });
        }
      );

      await Promise.all(savePromises);

      const tournamentRef = doc(db, "tournaments", id);
      await updateDoc(tournamentRef, {
        status: "live",
        startedAt: new Date().toISOString(),
      });

      // 處理所有輪空比賽（BYE）
      try {
        await processAllByes(
          id,
          initialMatches as Record<string, Match>,
          format
        );
        console.log("輪空處理完成");
      } catch (error) {
        console.error("處理輪空時發生錯誤:", error);
      }

      // 狀態會通過 Firestore 監聽自動更新
    } catch (error) {
      console.error("開始比賽失敗:", error);
      alert("開始比賽失敗，請稍後再試");
    } finally {
      setIsStarting(false);
    }
  };

  const handleJoinPinSubmit = async () => {
    if (joinPinInput.length !== 6) {
      setJoinPinError("PIN 碼必須是 6 位數");
      return;
    }

    setJoinPinError("");

    try {
      if (joinPinInput === (currentTournament as any).pin) {
        grantJoinPermission((currentTournament as any).id);
        setShowJoinPinModal(false);
        setJoinPinInput("");
        showPopup("驗證成功", "success");
      } else {
        setJoinPinError("PIN 碼不正確，請確認後重試");
      }
    } catch (error) {
      console.error("Error validating PIN:", error);
      setJoinPinError("驗證失敗，請重試");
    }
  };

  // 處理 KOTH 結束比賽
  const handleFinishKoth = async () => {
    if (!id || !currentTournament) return;

    showConfirm("確定要結束報隊比賽並結算排名嗎？", async () => {
      try {
        const stats = currentTournament.kothStats || {};
        let champion = "";
        let maxWins = -1;

        Object.entries(stats).forEach(([name, stat]) => {
          if ((stat as any).wins > maxWins) {
            maxWins = (stat as any).wins;
            champion = name;
          }
        });

        await updateDoc(doc(db, "tournaments", id), {
          status: "finished",
          champion: champion || null,
          finishedAt: new Date().toISOString(),
        });

        showPopup("比賽已結束", "success");
      } catch (error) {
        console.error("結束 KOTH 比賽失敗:", error);
        showPopup("結束比賽失敗", "error");
      }
    });
  };

  // 處理從 KOTH 隊列移除玩家
  const handleRemoveFromQueue = async (name: string) => {
    if (!id || !isOrganizer) return;

    showConfirm(`確定要將「${name}」從排隊名單移除嗎？`, async () => {
      try {
        await updateDoc(doc(db, "tournaments", id), {
          kothQueue: arrayRemove(name),
        });
        showPopup("已移除", "success");
      } catch (error) {
        console.error("移除排隊玩家失敗:", error);
        showPopup("移除失敗", "error");
      }
    });
  };

  // 處理從比賽移除選手（籌備階段）
  const handleRemovePlayerFromTournament = async (player: any) => {
    if (!id || !isOrganizer) return;

    showConfirm(`確定要將選手「${player.name}」移除嗎？`, async () => {
      try {
        await updateDoc(doc(db, "tournaments", id), {
          players: arrayRemove(player),
        });
        showPopup("選手已移除", "success");
      } catch (error) {
        console.error("移除選手失敗:", error);
        showPopup("移除失敗", "error");
      }
    });
  };

  // 如果還沒有 matches，從 format 創建初始對戰表
  const displayMatches =
    Object.keys(matches).length > 0
      ? matches
      : ((format
          ? mapPlayersToMatches(format, currentTournament.players)
          : {}) as Record<string, Match>);

  // 計算真實參賽人數
  const currentPlayersCount = currentTournament.players?.length || 0;
  const maxPlayersCount = format?.totalSlots || 0;

  // 根據狀態和人數生成訊息
  const getStatusMessage = () => {
    if (currentTournament.status === "draft") {
      // 如果 maxPlayersCount 為 0，表示格式未載入，只顯示當前人數
      if (maxPlayersCount === 0) {
        return `等待加入中... (${currentPlayersCount}人)`;
      }
      // 正常情況下比較人數
      if (
        format?.type !== "koth" &&
        maxPlayersCount > 0 &&
        currentPlayersCount >= maxPlayersCount
      ) {
        return `已滿額！(${currentPlayersCount}/${maxPlayersCount})`;
      } else if (format?.type === "koth") {
        return `等待加入中... (${currentPlayersCount}人)`;
      } else {
        return `等待加入中... (${currentPlayersCount}/${maxPlayersCount})`;
      }
    } else if (currentTournament.status === "live") {
      return `比賽進行中 (${currentPlayersCount}位參賽者)`;
    } else {
      return `比賽已結束 (${currentPlayersCount}位參賽者)`;
    }
  };

  // 倒數訊息
  const getCountdownMessage = () => {
    if (currentTournament.status !== "draft") return null;
    if (isExpired) return "比賽已過期";
    return `${timeLeft}`;
  };

  return (
    <div className="tournament-detail">
      <div className="tournament-detail__header">
        <button
          onClick={() => navigate("/")}
          className="tournament-detail__back-btn mb-4"
        >
          <ArrowLeft />
        </button>
        {/* 如果是舉辦者，根據比賽狀態顯示不同按鈕 */}
        {isOrganizer && currentTournament.status !== "finished" && (
          <div className="tournament-detail__organizer-actions">
            {/* 籌備階段：顯示編輯、刪除、開始比賽 */}
            {currentTournament.status === "draft" && (
              <>
                <Link
                  to={`/tournament/${currentTournament.id}/edit`}
                  className="tournament-detail__join-btn"
                >
                  編輯
                </Link>
                <button
                  onClick={() => setShowPinModal(true)}
                  className="tournament-detail__join-btn tournament-detail__scorer-btn"
                  title="查看計分碼"
                >
                  計分
                </button>
                <button
                  onClick={handleDeleteTournament}
                  disabled={isDeleting}
                  className="tournament-detail__join-btn tournament-detail__delete-btn"
                  title="刪除比賽"
                >
                  {isDeleting ? "刪除中..." : <>刪除</>}
                </button>
                <button
                  onClick={handleStartTournament}
                  disabled={currentPlayersCount < 2 || isStarting}
                  className="tournament-detail__join-btn tournament-detail__start-btn"
                  title={currentPlayersCount < 2 ? "至少需要2位參賽者" : ""}
                >
                  {isStarting ? "進行中" : "開始"}
                </button>
              </>
            )}

            {/* 比賽進行中：只顯示計分、刪除 */}
            {currentTournament.status === "live" && (
              <>
                {format?.type === "koth" && (
                  <button
                    onClick={handleFinishKoth}
                    className="tournament-detail__join-btn tournament-detail__finish-btn"
                  >
                    結束
                  </button>
                )}
                <button
                  onClick={() => setShowPinModal(true)}
                  className="tournament-detail__join-btn tournament-detail__scorer-btn"
                  title="查看計分碼"
                >
                  計分
                </button>
                <button
                  onClick={handleDeleteTournament}
                  disabled={isDeleting}
                  className="tournament-detail__join-btn tournament-detail__delete-btn"
                  title="刪除比賽"
                >
                  {isDeleting ? "刪除中..." : <>刪除</>}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className={`tournament-detail__msg tournament-detail__msg--${currentTournament.status}`}
      >
        {getStatusMessage()}
        {currentTournament.status === "draft" && getCountdownMessage() && (
          <div className="tournament-detail__countdown">
            {getCountdownMessage()}
          </div>
        )}
      </div>

      {/* 對戰表 */}
      {format && (
        <div className="bracket-view-container">
          {/* 報隊制特殊顯示 */}
          {format.type === "koth" && (
            <>
              {/* 籌備階段：顯示報名名單 */}
              {currentTournament.status === "draft" && (
                <div className="koth-display koth-display--draft">
                  <div
                    className="koth-side-info"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <div className="koth-queue">
                      <h3 className="koth-title">
                        已報名選手 ({currentPlayersCount})
                      </h3>
                      <div className="koth-queue-list">
                        {currentTournament.players &&
                        currentTournament.players.length > 0 ? (
                          currentTournament.players.map((player, index) => (
                            <div key={index} className="koth-queue-item">
                              <span className="koth-queue-pos">
                                {index + 1}
                              </span>
                              <span className="koth-queue-name">
                                {player.name}
                              </span>
                              {isOrganizer && (
                                <button
                                  className="koth-queue-remove"
                                  onClick={() =>
                                    handleRemovePlayerFromTournament(player)
                                  }
                                  title="移除"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="koth-empty-msg">尚無選手報名</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 進行中階段 */}
              {currentTournament.status === "live" && (
                <div className="koth-display">
                  {/* 目前比賽場次 */}
                  <div className="koth-current-match">
                    <h3 className="koth-title">正在對決</h3>
                    {matches["koth_match"] ? (
                      <BracketView
                        format={format}
                        matches={{ koth_match: matches["koth_match"] }}
                        tournamentId={id || ""}
                      />
                    ) : (
                      <div className="koth-no-match">暫無比賽</div>
                    )}
                  </div>

                  <div className="koth-side-info">
                    {/* 排隊列表 */}
                    <div className="koth-queue">
                      <h3 className="koth-title">
                        排隊名單 ({currentTournament.kothQueue?.length || 0})
                      </h3>
                      <div className="koth-queue-list">
                        {currentTournament.kothQueue &&
                        currentTournament.kothQueue.length > 0 ? (
                          currentTournament.kothQueue.map((name, index) => (
                            <div key={index} className="koth-queue-item">
                              <span className="koth-queue-pos">
                                {index + 1}
                              </span>
                              <span className="koth-queue-name">{name}</span>
                              {isOrganizer && (
                                <button
                                  className="koth-queue-remove"
                                  onClick={() => handleRemoveFromQueue(name)}
                                  title="移除"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="koth-empty-msg">尚無人排隊</div>
                        )}
                      </div>
                    </div>

                    {/* 勝場統計 */}
                    <div className="koth-stats">
                      <h3 className="koth-title">勝場統計</h3>
                      <div className="koth-stats-list">
                        {currentTournament.kothStats &&
                        Object.keys(currentTournament.kothStats).length > 0 ? (
                          Object.entries(currentTournament.kothStats)
                            .sort(
                              (a, b) => (b[1] as any).wins - (a[1] as any).wins
                            )
                            .map(([name, stat]) => (
                              <div key={name} className="koth-stat-item">
                                <span className="koth-stat-name">{name}</span>
                                <span className="koth-stat-wins">
                                  {(stat as any).wins} 勝
                                </span>
                              </div>
                            ))
                        ) : (
                          <div className="koth-empty-msg">尚無勝場記錄</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 原有淘汰賽顯示 */}
          {format.type !== "koth" && (
            <>
              {(matchesLoading || isFixing) &&
              currentTournament.status === "live" ? (
                <div className="bracket-view-container__loading">
                  <Loading
                    text={isFixing ? "正在初始化對戰表..." : "載入對戰表..."}
                  />
                </div>
              ) : (
                <BracketView
                  format={format}
                  matches={displayMatches}
                  tournamentId={id || ""}
                />
              )}
            </>
          )}

          {/* KOTH 結束後顯示 */}
          {format.type === "koth" &&
            currentTournament.status === "finished" && (
              <div className="koth-finished">
                <div className="koth-winner-card">
                  <div className="koth-winner-label">最終贏家</div>
                  <div className="koth-winner-name">
                    {currentTournament.champion || "無"}
                  </div>
                </div>

                {/* 結束後的勝場總排名 */}
                <div className="koth-final-stats">
                  <h3 className="koth-title">最終勝場排名</h3>
                  <div className="koth-stats-list">
                    {currentTournament.kothStats &&
                    Object.keys(currentTournament.kothStats).length > 0 ? (
                      Object.entries(currentTournament.kothStats)
                        .sort((a, b) => (b[1] as any).wins - (a[1] as any).wins)
                        .map(([name, stat], index) => (
                          <div
                            key={name}
                            className={`koth-stat-item ${
                              index === 0 ? "koth-stat-item--first" : ""
                            }`}
                          >
                            <div className="koth-stat-rank">
                              {index === 0
                                ? "🥇"
                                : index === 1
                                ? "🥈"
                                : index === 2
                                ? "🥉"
                                : `${index + 1}`}
                            </div>
                            <span className="koth-stat-name">{name}</span>
                            <span className="koth-stat-wins">
                              {(stat as any).wins} 勝
                            </span>
                          </div>
                        ))
                    ) : (
                      <div className="koth-empty-msg">尚無勝場記錄</div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* PIN 碼彈窗 - 只顯示計分碼 */}
      {showPinModal && (
        <PinModal
          pin={currentTournament.pin}
          scorerPin={currentTournament.scorerPin}
          tournamentId={currentTournament.id}
          onClose={() => setShowPinModal(false)}
          initialSlide={1}
        />
      )}

      {/* 報名彈窗 */}
      {showJoinModal && (
        <JoinModal
          tournament={currentTournament}
          format={format}
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            // 報名成功後可以執行的操作（資料會自動更新）
          }}
        />
      )}

      {/* 報名 PIN 碼輸入彈窗 */}
      {showJoinPinModal && (
        <div
          className="pin-modal-overlay"
          onClick={() => setShowJoinPinModal(false)}
        >
          <div
            className="pin-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pin-modal-close"
              onClick={() => {
                setShowJoinPinModal(false);
                setJoinPinInput("");
                setJoinPinError("");
              }}
            >
              ✕
            </button>
            <h3 className="pin-modal-title">輸入報名碼</h3>
            <p className="pin-modal-subtitle">
              請輸入 6 位數報名 PIN 碼以獲得報名權限
            </p>
            <input
              type="text"
              placeholder="輸入 6 位數 PIN 碼"
              value={joinPinInput}
              onChange={(e) => {
                setJoinPinInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                setJoinPinError("");
              }}
              className={`pin-modal-input ${
                joinPinError ? "pin-modal-input--error" : ""
              }`}
              maxLength={6}
              autoFocus
            />

            {joinPinError && <p className="pin-modal-error">{joinPinError}</p>}
            <button
              onClick={handleJoinPinSubmit}
              disabled={joinPinInput.length !== 6}
              className="pin-modal-submit-btn"
            >
              驗證
            </button>
          </div>
        </div>
      )}

      {/* 固定在底部的報名按鈕（籌備階段，或報隊制進行中且尚未報名時顯示） */}
      {(currentTournament.status === "draft" ||
        (format?.type === "koth" && currentTournament.status === "live")) &&
        !hasJoined && (
          <>
            {hasJoinPermission || isOrganizer ? (
              <button
                onClick={() => {
                  // 檢查是否已滿人（報隊制不限人數）
                  if (
                    format?.type !== "koth" &&
                    format &&
                    currentPlayersCount >= format.totalSlots
                  ) {
                    showPopup("報名人數已滿", "error");
                    return;
                  }
                  // 開啟報名彈窗
                  setShowJoinModal(true);
                }}
                className="tournament-detail__floating-join-btn"
              >
                報名參賽
              </button>
            ) : (
              <button
                onClick={() => setShowJoinPinModal(true)}
                className="tournament-detail__floating-join-btn"
              >
                輸入 PIN 碼報名
              </button>
            )}
          </>
        )}

      {/* 已報名提示（固定在底部） */}
      {(currentTournament.status === "draft" ||
        (format?.type === "koth" && currentTournament.status === "live")) &&
        hasJoined && (
          <div className="tournament-detail__floating-joined-badge">已報名</div>
        )}

      {/* 資訊彈窗 */}
      {showInfoModal && (
        <div
          className="info-modal-overlay"
          onClick={() => setShowInfoModal(false)}
        >
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="info-modal__header">
              <h2 className="info-modal__title">分享連結</h2>
              <button
                className="info-modal__close-btn"
                onClick={() => setShowInfoModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="info-modal__content">
              <div className="info-container">
                <div className="info-container__left">
                  <div className="info-container__sport">
                    {currentTournament.name}
                  </div>
                  {/* 名額資訊 */}
                  <div className="info-container__quota">
                    {maxPlayersCount > 0 ? (
                      <>
                        <span className="info-container__quota-current">
                          {currentPlayersCount}
                        </span>
                        <span className="info-container__quota-separator">
                          /
                        </span>
                        <span className="info-container__quota-max">
                          {maxPlayersCount}
                        </span>
                        <span className="info-container__quota-label">
                          名參賽者
                        </span>
                      </>
                    ) : (
                      <span className="info-container__quota-label">
                        {currentPlayersCount} 名參賽者
                      </span>
                    )}
                  </div>
                  {/* 規則和賽制資訊 */}
                  <div className="info-container__details">
                    <div className="info-container__detail-item">
                      <span className="info-container__detail-value">
                        {sport?.name || "未設定"}{" "}
                      </span>
                    </div>
                    <div className="info-container__detail-item">
                      <span className="info-container__detail-value">
                        {currentTournament.config.rules
                          ? getSetsFormatLabel(currentTournament.config.rules)
                          : "未設定"}
                      </span>
                    </div>
                    <div className="info-container__detail-item">
                      <span className="info-container__detail-value">
                        {format?.name || "未設定"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="info-container__right">
                  <div className="info-container__pin-QR">
                    <QRCodeSVG
                      value={`${window.location.origin}/tournament/${currentTournament.id}?pin=${currentTournament.pin}`}
                      size={80}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="info-container__pin">
                    {currentTournament.pin}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 懸浮在右下角的資訊按鈕 */}
      <button
        className="tournament-detail__floating-info-btn"
        onClick={() => setShowInfoModal(true)}
        title="查看比賽資訊"
      >
        <div className="tournament-detail__floating-info-qr">
          <QRCodeSVG
            value={`${window.location.origin}/tournament/${currentTournament.id}?pin=${currentTournament.pin}`}
            size={60}
            level="M"
            includeMargin={false}
          />
        </div>
        <div className="tournament-detail__floating-info-pin">
          {currentTournament.pin}
        </div>
      </button>
    </div>
  );
}
