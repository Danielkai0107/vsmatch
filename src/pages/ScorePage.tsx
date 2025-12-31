import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { usePermissionStore } from "../stores/permissionStore";
import { usePopup } from "../contexts/PopupContext";
import { getFormatById } from "../config/sportsData";
import {
  createNewSet,
  isMatchComplete,
  getSetsWon,
  getMatchWinner,
  formatScore,
  getCurrentSetTarget,
  getCumulativeScore,
  isInOvertime,
  getCurrentSetName,
} from "../utils/scoringLogic";
import { progressWinner } from "../utils/progressionLogic";
import { getMatchRoundName } from "../utils/bracketLogic";
import type { Match, Tournament } from "../types";
import { getSetsFormatLabel } from "../types";
import { ArrowLeft } from "lucide-react";
import Loading from "../components/ui/Loading";
import ChampionPopup from "../components/ui/ChampionPopup";
import "./ScorePage.scss";

export function ScorePage() {
  const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const { showPopup, showConfirm } = usePopup();
  const hasScorePermission = usePermissionStore((state) =>
    state.hasScorePermission(tournamentId || "")
  );

  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChampionPopup, setShowChampionPopup] = useState(false);
  const [championData, setChampionData] = useState<{
    champion: string;
    runnerUp?: string;
  } | null>(null);

  // 檢查權限
  useEffect(() => {
    if (!hasScorePermission) {
      navigate(`/tournament/${tournamentId}/scorer`);
    }
  }, [hasScorePermission, tournamentId, navigate]);

  // 自動返回對戰表：如果找不到資料
  useEffect(() => {
    if (!loading && (!match || !tournament)) {
      console.log("找不到比賽資料，自動返回對戰表");
      navigate(`/tournament/${tournamentId}`);
    }
  }, [loading, match, tournament, tournamentId, navigate]);

  // 自動返回對戰表：如果比賽已完成
  useEffect(() => {
    if (tournament?.status === "finished") {
      console.log("比賽已完成，自動返回對戰表");
      navigate(`/tournament/${tournamentId}`);
    }
  }, [tournament?.status, tournamentId, navigate]);

  // 載入比賽和場次資料
  useEffect(() => {
    const loadData = async () => {
      if (!tournamentId || !matchId) {
        console.log("缺少 tournamentId 或 matchId");
        return;
      }

      console.log("載入比賽資料:", { tournamentId, matchId });

      try {
        const [tournamentSnap, matchSnap] = await Promise.all([
          getDoc(doc(db, "tournaments", tournamentId)),
          getDoc(doc(db, "tournaments", tournamentId, "matches", matchId)),
        ]);

        console.log("比賽文檔存在:", tournamentSnap.exists());
        console.log("場次文檔存在:", matchSnap.exists());

        if (tournamentSnap.exists()) {
          const tournamentData = tournamentSnap.data() as Tournament;
          console.log("比賽狀態:", tournamentData.status);
          setTournament(tournamentData);
        } else {
          console.error("找不到比賽文檔");
        }

        if (matchSnap.exists()) {
          const matchData = matchSnap.data() as Match;
          console.log("比賽數據:", {
            matchId: matchData.matchId,
            player1: matchData.player1,
            player2: matchData.player2,
            status: matchData.status,
          });
          // 如果沒有局數，初始化第一局
          if (!matchData.sets || matchData.sets.length === 0) {
            matchData.sets = [createNewSet()];
            matchData.currentSet = 0;
          }
          setMatch(matchData);
        } else {
          console.error(
            "找不到場次文檔，路徑:",
            `tournaments/${tournamentId}/matches/${matchId}`
          );
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tournamentId, matchId]);

  const handleScore = async (player: 1 | 2, delta: number) => {
    if (!match || !tournament || !tournamentId || !matchId) return;

    const newSets = [...match.sets];
    const currentSet = newSets[match.currentSet];

    if (!currentSet) return;

    // 更新分數
    if (player === 1) {
      currentSet.p1Score = Math.max(0, currentSet.p1Score + delta);
    } else {
      currentSet.p2Score = Math.max(0, currentSet.p2Score + delta);
    }

    setMatch({ ...match, sets: newSets });

    // 立即保存到資料庫（觀眾即時看到分數變化）
    try {
      await updateDoc(
        doc(db, "tournaments", tournamentId, "matches", matchId),
        {
          sets: newSets,
          status: "live",
        }
      );
    } catch (error) {
      console.error("Error updating score:", error);
    }
  };

  const handleEndCurrentSet = async () => {
    if (!match || !tournament || !tournamentId || !matchId) return;

    const currentSet = match.sets[match.currentSet];
    if (!currentSet) return;

    // 檢查是否有分數
    if (currentSet.p1Score === 0 && currentSet.p2Score === 0) {
      showPopup("尚未有任何分數，無法結束本局", "warning");
      return;
    }

    // 獲取規則配置
    const rule = tournament.config.rules;
    if (!rule) return;

    // 累計制：不需要驗證單局結束條件，可以隨時結束本局
    if (rule.scoringMode !== "cumulative") {
      // 單局制：驗證本局是否達到結束條件
      const targetScore = getCurrentSetTarget(
        match.sets,
        rule,
        match.currentSet
      );
      const maxScore = Math.max(currentSet.p1Score, currentSet.p2Score);
      const scoreDiff = Math.abs(currentSet.p1Score - currentSet.p2Score);

      if (maxScore < targetScore) {
        showPopup(
          `本局尚未結束！\n目標分數：${targetScore} 分\n當前最高分：${maxScore} 分`,
          "warning"
        );
        return;
      }

      if (scoreDiff < 2) {
        showPopup(
          `本局尚未結束！\n需要領先至少 2 分才能獲勝\n當前分差：${scoreDiff} 分`,
          "warning"
        );
        return;
      }
    }

    showConfirm(
      `確定結束本局嗎？\n當前比分：${currentSet.p1Score}-${currentSet.p2Score}`,
      async () => {
        await executeEndCurrentSet();
      }
    );
  };

  const executeEndCurrentSet = async () => {
    if (!match || !tournament || !tournamentId || !matchId) return;

    const rule = tournament.config.rules;
    if (!rule) return;

    setSaving(true);

    try {
      const newSets = [...match.sets];

      // 累計制特殊邏輯
      if (rule.scoringMode === "cumulative") {
        const completedSetsCount = newSets.length;

        // 1. 如果還沒打完固定局數，繼續下一局
        if (completedSetsCount < rule.totalSets) {
          newSets.push(createNewSet());
          const newCurrentSet = newSets.length - 1;

          await updateDoc(
            doc(db, "tournaments", tournamentId, "matches", matchId),
            {
              sets: newSets,
              currentSet: newCurrentSet,
              status: "live",
            }
          );

          setMatch({ ...match, sets: newSets, currentSet: newCurrentSet });
          showPopup(
            `本${isBasketball ? "節" : "局"}已結束！進入${getCurrentSetName(
              rule,
              newCurrentSet,
              tournament?.config.sportId
            )}`,
            "success"
          );
          return;
        }

        // 2. 打完固定局數，檢查總分
        const { p1, p2 } = getCumulativeScore(newSets);

        if (p1 === p2 && rule.allowOvertime) {
          // 總分相同，進入延長賽
          newSets.push(createNewSet());
          const newCurrentSet = newSets.length - 1;

          await updateDoc(
            doc(db, "tournaments", tournamentId, "matches", matchId),
            {
              sets: newSets,
              currentSet: newCurrentSet,
              status: "live",
            }
          );

          setMatch({ ...match, sets: newSets, currentSet: newCurrentSet });
          showPopup(
            `總分平手（${p1}:${p2}）！進入${getCurrentSetName(
              rule,
              newCurrentSet,
              tournament?.config.sportId
            )}`,
            "info"
          );
          return;
        }

        // 3. 總分不同，或不允許延長賽，比賽真正結束
        // 推進 currentSet 到 sets.length，標記所有局已完成
        const finalCurrentSet = newSets.length;
        await updateDoc(
          doc(db, "tournaments", tournamentId, "matches", matchId),
          {
            currentSet: finalCurrentSet,
          }
        );

        setMatch({ ...match, currentSet: finalCurrentSet });
        showPopup(
          `比賽已結束！總分 ${p1}:${p2}\n請點擊「結束比賽」按鈕確認勝者`,
          "info"
        );
        return;
      }

      // 單局制邏輯
      // 檢查是否已經達成整場比賽的勝利條件
      if (isMatchComplete(newSets, rule)) {
        const finalCurrentSet = newSets.length;
        await updateDoc(
          doc(db, "tournaments", tournamentId, "matches", matchId),
          {
            currentSet: finalCurrentSet,
          }
        );
        setMatch({ ...match, currentSet: finalCurrentSet });
        showPopup("比賽已結束！請點擊「結束比賽」按鈕確認勝者", "info");
        return;
      }

      // 開始新局
      newSets.push(createNewSet());
      const newCurrentSet = newSets.length - 1;

      // 更新到資料庫
      await updateDoc(
        doc(db, "tournaments", tournamentId, "matches", matchId),
        {
          sets: newSets,
          currentSet: newCurrentSet,
          status: "live",
        }
      );

      setMatch({ ...match, sets: newSets, currentSet: newCurrentSet });
      showPopup("本局已結束！進入下一局", "success");
    } catch (error) {
      console.error("Error ending set:", error);
      showPopup("結束本局失敗，請重試", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEndMatch = async () => {
    if (!match || !tournament || !tournamentId || !matchId) return;

    showConfirm("確定要結束此場比賽嗎？", async () => {
      setSaving(true);

      try {
        const rule = tournament.config.rules;
        if (!rule) return;

        const winner = getMatchWinner(match.sets, rule);
        if (!winner) {
          showPopup("比賽尚未達到獲勝條件", "warning");
          setSaving(false);
          return;
        }

        const winnerPlayer =
          winner === "player1" ? match.player1 : match.player2;
        if (!winnerPlayer) {
          setSaving(false);
          return;
        }

        // 更新比賽狀態
        await updateDoc(
          doc(db, "tournaments", tournamentId, "matches", matchId),
          {
            status: "completed",
            winner: winnerPlayer.name,
          }
        );

        // 處理晉級
        const format = getFormatById(tournament.config.formatId);
        let isFinished = false;
        if (format) {
          const result = await progressWinner(tournamentId, matchId, winnerPlayer, format);
          isFinished = result.isFinished;
        }

        if (isFinished) {
          const runnerUp =
            match.player1?.name === winnerPlayer.name
              ? match.player2?.name
              : match.player1?.name;

          setChampionData({
            champion: winnerPlayer.name,
            runnerUp: runnerUp,
          });
          setShowChampionPopup(true);
          // 不立即導航，讓用戶看到彈窗
        } else {
          showPopup(`比賽結束！勝者：${winnerPlayer.name}`, "success");
          navigate(`/tournament/${tournamentId}`);
        }
      } catch (error) {
        console.error("Error ending match:", error);
        showPopup("結束比賽失敗", "error");
      } finally {
        setSaving(false);
      }
    });
  };

  if (loading) {
    return <Loading fullScreen text="載入中..." />;
  }

  // 檢查比賽是否還在籌備階段
  if (tournament && tournament.status === "draft") {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/tournament/${tournamentId}`)}
          className="score-page__back-btn"
        >
          <ArrowLeft />
        </button>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            比賽籌備中，即將開始
          </h2>
          <p className="text-gray-600 mb-6">
            主辦人需要先點擊「開始比賽」按鈕，才能開始計分
          </p>
          <button
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回對戰表
          </button>
        </div>
      </div>
    );
  }

  // 檢查是否為輪空比賽
  if (match && (!match.player1 || !match.player2)) {
    const byePlayer = match.player1 || match.player2;
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/tournament/${tournamentId}`)}
          className="score-page__back-btn"
        >
          <ArrowLeft />
        </button>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">輪空比賽</h2>
          <p className="text-gray-600 mb-4">
            此場比賽為輪空（BYE），選手自動晉級
          </p>
          {byePlayer && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">晉級選手</p>
              <p className="text-xl font-bold text-blue-600">
                {byePlayer.name}
              </p>
            </div>
          )}
          <button
            onClick={() => navigate(`/tournament/${tournamentId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回對戰表
          </button>
        </div>
      </div>
    );
  }

  // 如果找不到資料，返回 null（useEffect 會自動導航）
  if (!match || !tournament || !match.player1 || !match.player2) {
    return null;
  }

  const rule = tournament.config.rules;
  const format = getFormatById(tournament.config.formatId);
  const roundName = format ? getMatchRoundName(format, matchId!) : "";
  const currentSet = match.sets[match.currentSet];

  // 根據計分模式計算顯示數據
  const isCumulative = rule?.scoringMode === "cumulative";
  const setsWon = getSetsWon(match.sets, match.currentSet);
  const cumulativeScore = isCumulative
    ? getCumulativeScore(match.sets.slice(0, match.currentSet))
    : null;
  const isOvertimeMode = rule && isInOvertime(rule, match.currentSet);
  const currentSetName = rule
    ? getCurrentSetName(rule, match.currentSet, tournament?.config.sportId)
    : "";

  // 籃球專用：節數顯示
  const isBasketball = tournament?.config.sportId === "basketball";

  const matchComplete = rule
    ? isMatchComplete(match.sets, rule, match.currentSet)
    : false;
  const targetScore =
    rule && currentSet
      ? getCurrentSetTarget(match.sets, rule, match.currentSet)
      : 0;

  return (
    <div className="score-page-container">
      {/* 頂部導航欄 */}
      <div className="score-header">
        <button
          onClick={() => navigate(`/tournament/${tournamentId}`)}
          className="back-button"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>
        <div className="match-info">
          <h1 className="round-name">{roundName}</h1>
          <div className="rule-badge">
            {!isCumulative &&
              rule?.scoreToWin > 0 &&
              `${rule.scoreToWin}分制 • `}
            {rule ? getSetsFormatLabel(rule) : ""}
            {isOvertimeMode && " • 延長賽"}
          </div>
        </div>
      </div>

      <div className="score-content">
        {/* 主要計分看板 */}
        <div className="scoreboard-card">
          {/* 進度條 (籃球/累計制) */}
          {isCumulative && rule && (
            <div className="game-progress">
              <div className="progress-label">
                <span>比賽進度</span>
                <span className="current-status">
                  {match.currentSet}/{rule.totalSets}
                  {isBasketball ? "節" : "局"}
                  {isOvertimeMode && " + 延長賽"}
                </span>
              </div>
              <div className="progress-steps">
                {Array.from({ length: rule.totalSets }).map((_, index) => (
                  <div
                    key={index}
                    className={`step-bar ${
                      index < match.currentSet
                        ? "completed"
                        : index === match.currentSet
                        ? "active"
                        : "pending"
                    }`}
                  />
                ))}
                {isOvertimeMode &&
                  Array.from({
                    length: match.currentSet - rule.totalSets + 1,
                  }).map((_, index) => (
                    <div key={`ot-${index}`} className="step-bar overtime" />
                  ))}
              </div>
            </div>
          )}

          {/* 核心比分顯示區域 */}
          <div className="score-main-display">
            <div className="team-score team-1">
              <div className="team-label">{isCumulative ? "總分" : "局數"}</div>
              <div className="score-value">
                {isCumulative ? cumulativeScore?.p1 || 0 : setsWon.p1}
              </div>
            </div>

            <div className="score-divider">
              <div className="period-name">{currentSetName}</div>
              <div className="vs-label">VS</div>
            </div>

            <div className="team-score team-2">
              <div className="team-label">{isCumulative ? "總分" : "局數"}</div>
              <div className="score-value">
                {isCumulative ? cumulativeScore?.p2 || 0 : setsWon.p2}
              </div>
            </div>
          </div>

          {/* 歷史局數比分 */}
          {match.sets.length > 1 && (
            <div className="history-scores">
              <div className="history-label">歷史紀錄</div>
              <div className="history-list">
                {match.sets.slice(0, match.currentSet).map((set, index) => (
                  <div key={index} className="history-item">
                    <span className="set-num">
                      {index < rule.totalSets
                        ? `${index + 1}${isBasketball ? "節" : "局"}`
                        : `OT${index - rule.totalSets + 1}`}
                    </span>
                    <span className="set-score">
                      {set.p1Score}-{set.p2Score}
                    </span>
                  </div>
                ))}
              </div>
              {!isCumulative && (
                <div className="history-summary">
                  {formatScore(match.sets.slice(0, -1))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 互動計分區 */}
        <div className="action-area">
          {/* 選手 1 控制區 */}
          <div className="player-card p1-card">
            <div className="player-info">
              <div className="player-name">
                <span className="color-indicator"></span>
                {match.player1.name}
              </div>
              <div className="current-points">{currentSet?.p1Score ?? "-"}</div>
            </div>
            {currentSet && (
              <div className="button-group">
                <button onClick={() => handleScore(1, 1)} className="btn-add">
                  +1
                </button>
                <button
                  onClick={() => handleScore(1, -1)}
                  disabled={currentSet.p1Score === 0}
                  className="btn-undo"
                >
                  撤銷
                </button>
              </div>
            )}
          </div>

          {/* 中間資訊 */}
          <div className="set-meta">
            {!isCumulative && currentSet && (
              <div className="target-info">
                目標 <span>{targetScore}</span> 分
              </div>
            )}
            {currentSet ? (
              <button
                onClick={handleEndCurrentSet}
                disabled={saving}
                className="btn-next-set"
              >
                {saving
                  ? "處理中..."
                  : isCumulative
                  ? `完成${isBasketball ? "本節" : "本局"}`
                  : "結束本局"}
              </button>
            ) : (
              <div className="period-name finished">已完賽</div>
            )}
          </div>

          {/* 選手 2 控制區 */}
          <div className="player-card p2-card">
            <div className="player-info">
              <div className="player-name">
                <span className="color-indicator"></span>
                {match.player2.name}
              </div>
              <div className="current-points">{currentSet?.p2Score ?? "-"}</div>
            </div>
            {currentSet && (
              <div className="button-group">
                <button onClick={() => handleScore(2, 1)} className="btn-add">
                  +1
                </button>
                <button
                  onClick={() => handleScore(2, -1)}
                  disabled={currentSet.p2Score === 0}
                  className="btn-undo"
                >
                  撤銷
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 */}
        <div className="footer-actions">
          <button
            onClick={handleEndMatch}
            disabled={!matchComplete || saving}
            className={`btn-finish-match ${matchComplete ? "ready" : ""}`}
          >
            {saving
              ? "處理中..."
              : matchComplete
              ? "結束比賽並確認勝者"
              : "比賽進行中..."}
          </button>
          {!matchComplete && (
            <p className="status-hint">
              {isCumulative
                ? `需打完 ${rule?.totalSets} ${
                    isBasketball ? "節" : "局"
                  } 並分出勝負`
                : `需贏得 ${rule?.setsToWin} 局勝利才能結束`}
            </p>
          )}
        </div>
      </div>

      {/* 冠軍慶祝彈窗 */}
      {tournament && championData && (
        <ChampionPopup
          isOpen={showChampionPopup}
          onClose={() => {
            setShowChampionPopup(false);
            navigate(`/tournament/${tournamentId}`);
          }}
          tournamentName={tournament.name}
          championName={championData.champion}
          runnerUpName={championData.runnerUp}
          tournamentId={tournamentId || ""}
        />
      )}
    </div>
  );
}
