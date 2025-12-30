import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
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
import "./TournamentDetailPage.scss";

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showPopup, showConfirm } = usePopup();
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useTournamentById(id);
  useMatches(id);

  const { currentTournament, loading } = useTournamentStore();
  const { matches, loading: matchesLoading } = useMatchStore();
  const [isFixing, setIsFixing] = useState(false);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [hasAttemptedMatchesLoad, setHasAttemptedMatchesLoad] = useState(false);

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

  if (loading || isFixing) {
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

  // 檢查是否為舉辦者
  const isOrganizer = user?.uid === currentTournament.organizerId;

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
      if (currentPlayersCount >= maxPlayersCount) {
        return `已滿額！(${currentPlayersCount}/${maxPlayersCount})`;
      } else {
        return `等待加入中... (${currentPlayersCount}/${maxPlayersCount})`;
      }
    } else if (currentTournament.status === "live") {
      return `比賽進行中 (${currentPlayersCount}位參賽者)`;
    } else {
      return `比賽已結束 (${currentPlayersCount}位參賽者)`;
    }
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
                  {isDeleting ? "刪除中..." : <>結束</>}
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
      </div>

      {/* 對戰表 */}
      {format && (
        <div className="bracket-view-container">
          {/* <h2 className="bracket-view-container__title">對戰表</h2> */}
          <BracketView
            format={format}
            matches={displayMatches}
            tournamentId={id || ""}
          />
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

      {/* 固定在底部的報名按鈕（僅在籌備階段且尚未報名時顯示） */}
      {currentTournament.status === "draft" && !hasJoined && (
        <button
          onClick={() => {
            // 檢查是否已滿人
            if (format && currentPlayersCount >= format.totalSlots) {
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
      )}

      {/* 已報名提示（固定在底部） */}
      {currentTournament.status === "draft" && hasJoined && (
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
                      value={`${window.location.origin}/tournament/${currentTournament.id}`}
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
            value={`${window.location.origin}/tournament/${currentTournament.id}`}
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
