import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { usePermissionStore } from "../stores/permissionStore";
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

export function ScorePage() {
  const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const hasScorePermission = usePermissionStore((state) =>
    state.hasScorePermission(tournamentId || "")
  );

  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 檢查權限
  useEffect(() => {
    if (!hasScorePermission) {
      navigate(`/tournament/${tournamentId}/scorer`);
    }
  }, [hasScorePermission, tournamentId, navigate]);

  // 載入比賽和場次資料
  useEffect(() => {
    const loadData = async () => {
      if (!tournamentId || !matchId) return;

      try {
        const [tournamentSnap, matchSnap] = await Promise.all([
          getDoc(doc(db, "tournaments", tournamentId)),
          getDoc(doc(db, "tournaments", tournamentId, "matches", matchId)),
        ]);

        if (tournamentSnap.exists()) {
          setTournament(tournamentSnap.data() as Tournament);
        }

        if (matchSnap.exists()) {
          const matchData = matchSnap.data() as Match;
          // 如果沒有局數，初始化第一局
          if (!matchData.sets || matchData.sets.length === 0) {
            matchData.sets = [createNewSet()];
            matchData.currentSet = 0;
          }
          setMatch(matchData);
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
      alert("尚未有任何分數，無法結束本局");
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
        alert(
          `本局尚未結束！\n目標分數：${targetScore} 分\n當前最高分：${maxScore} 分`
        );
        return;
      }

      if (scoreDiff < 2) {
        alert(
          `本局尚未結束！\n需要領先至少 2 分才能獲勝\n當前分差：${scoreDiff} 分`
        );
        return;
      }
    }

    if (
      !confirm(
        `確定結束本局嗎？\n當前比分：${currentSet.p1Score}-${currentSet.p2Score}`
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const newSets = [...match.sets];

      // 累計制特殊邏輯
      if (rule.scoringMode === "cumulative") {
        const completedSetsCount = newSets.length;

        // 如果還沒打完固定局數，繼續下一局
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
          alert(`本局已結束！進入第${newCurrentSet + 1}局`);
          return;
        }

        // 打完固定局數，檢查總分
        const { p1, p2 } = getCumulativeScore(newSets);

        if (p1 === p2) {
          // 總分相同，需要延長賽
          if (rule.allowOvertime) {
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
            alert(
              `總分平手（${p1}:${p2}）！進入延長賽第${
                newCurrentSet - rule.totalSets + 1
              }局`
            );
            return;
          } else {
            alert("比賽結束！總分平手，請點擊「結束比賽」按鈕");
            return;
          }
        }

        // 總分不同，比賽結束
        alert(`比賽已結束！總分 ${p1}:${p2}\n請點擊「結束比賽」按鈕確認勝者`);
        return;
      }

      // 單局制邏輯
      // 檢查是否已經達成整場比賽的勝利條件
      if (isMatchComplete(newSets, rule)) {
        alert("比賽已結束！請點擊「結束比賽」按鈕確認勝者");
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
      alert("本局已結束！進入下一局");
    } catch (error) {
      console.error("Error ending set:", error);
      alert("結束本局失敗，請重試");
    } finally {
      setSaving(false);
    }
  };

  const handleEndMatch = async () => {
    if (!match || !tournament || !tournamentId || !matchId) return;
    if (!confirm("確定要結束此場比賽嗎？")) return;

    setSaving(true);

    try {
      const rule = tournament.config.rules;
      if (!rule) return;

      const winner = getMatchWinner(match.sets, rule);
      if (!winner) {
        alert("比賽尚未達到獲勝條件");
        return;
      }

      const winnerPlayer = winner === "player1" ? match.player1 : match.player2;
      if (!winnerPlayer) return;

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
      if (format) {
        await progressWinner(tournamentId, matchId, winnerPlayer, format);
      }

      alert(`比賽結束！勝者：${winnerPlayer.name}`);
      navigate(`/tournament/${tournamentId}`);
    } catch (error) {
      console.error("Error ending match:", error);
      alert("結束比賽失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    );
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

  if (!match || !tournament || !match.player1 || !match.player2) {
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(`/tournament/${tournamentId}`)}
          className="score-page__back-btn"
        >
          <ArrowLeft />
        </button>
        <div className="text-center py-12">
          <p className="text-gray-600">找不到比賽或選手資料</p>
        </div>
      </div>
    );
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
  const currentSetName = rule ? getCurrentSetName(rule, match.currentSet) : "";

  const matchComplete = rule
    ? isMatchComplete(match.sets, rule, match.currentSet)
    : false;
  const targetScore =
    rule && currentSet
      ? getCurrentSetTarget(match.sets, rule, match.currentSet)
      : 0;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 頭部 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <button
          onClick={() => navigate(`/tournament/${tournamentId}`)}
          className="score-page__back-btn"
        >
          <ArrowLeft />
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          {roundName}
        </h1>
        <p className="text-xs md:text-sm text-gray-600">
          {!isCumulative && rule?.scoreToWin > 0 && `${rule.scoreToWin}分制 • `}
          {rule ? getSetsFormatLabel(rule) : ""}
          {isOvertimeMode && " • 延長賽"}
        </p>
      </div>

      {/* 比賽狀態資訊 */}
      <div className="bg-gradient-to-r from-blue-50 to-red-50 rounded-lg p-4 mb-4">
        {/* 累計制進度條 */}
        {isCumulative && rule && (
          <div className="mb-4 pb-3 border-b border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-600">比賽進度</span>
              <span className="text-xs font-semibold text-gray-700">
                {match.currentSet}/{rule.totalSets}局
                {isOvertimeMode && " + 延長賽"}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: rule.totalSets }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index < match.currentSet
                      ? "bg-green-500"
                      : index === match.currentSet
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-300"
                  }`}
                />
              ))}
              {isOvertimeMode &&
                Array.from({
                  length: match.currentSet - rule.totalSets + 1,
                }).map((_, index) => (
                  <div
                    key={`ot-${index}`}
                    className="h-2 w-8 rounded-full bg-orange-500"
                  />
                ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <div className="text-xs text-gray-600 mb-1">
              {isCumulative ? "累計總分" : "獲勝局數"}
            </div>
            <div className="text-3xl md:text-4xl font-bold text-blue-600">
              {isCumulative ? cumulativeScore?.p1 || 0 : setsWon.p1}
            </div>
          </div>
          <div className="text-center px-4">
            <div className="text-xs text-gray-600 mb-1">{currentSetName}</div>
            <div className="text-2xl font-bold text-gray-400">VS</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-xs text-gray-600 mb-1">
              {isCumulative ? "累計總分" : "獲勝局數"}
            </div>
            <div className="text-3xl md:text-4xl font-bold text-red-600">
              {isCumulative ? cumulativeScore?.p2 || 0 : setsWon.p2}
            </div>
          </div>
        </div>

        {/* 各局歷史分數 */}
        {match.sets.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            {isCumulative ? (
              <div>
                <div className="text-xs text-gray-600 mb-2 text-center font-semibold">
                  各局分數記錄
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {match.sets.slice(0, match.currentSet).map((set, index) => (
                    <div
                      key={index}
                      className="bg-white rounded px-2 py-1 text-center shadow-sm"
                    >
                      <div className="text-xs text-gray-500">
                        {index < rule.totalSets
                          ? `第${index + 1}局`
                          : `延長${index - rule.totalSets + 1}`}
                      </div>
                      <div className="text-sm font-bold">
                        <span className="text-blue-600">{set.p1Score}</span>
                        <span className="text-gray-400 mx-1">-</span>
                        <span className="text-red-600">{set.p2Score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-center text-gray-600">
                歷史比分：{formatScore(match.sets.slice(0, -1))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 計分區 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* 選手 1 - 藍方 */}
        <div className="bg-blue-50 p-4 border-b-4 border-blue-600">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
            🔵 {match.player1.name}
          </h2>
          {currentSet && (
            <div className="flex items-center justify-between gap-4">
              <div className="text-5xl md:text-7xl font-bold text-blue-600 flex-1 text-center">
                {currentSet.p1Score}
              </div>
              <div className="flex flex-col gap-2 min-w-[100px]">
                <button
                  onClick={() => handleScore(1, 1)}
                  className="px-4 md:px-6 py-3 md:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg md:text-2xl font-bold shadow-lg active:scale-95 transition-transform"
                >
                  + 得分
                </button>
                <button
                  onClick={() => handleScore(1, -1)}
                  disabled={currentSet.p1Score === 0}
                  className="px-4 md:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ↶ 撤銷
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 當前局資訊與控制 */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-4 px-4">
          {/* 累計制：顯示本局分數 */}
          {isCumulative && currentSet && (
            <div className="text-center mb-3 bg-white rounded-lg p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-1">本局分數</div>
              <div className="flex justify-center items-center gap-4">
                <div className="text-2xl font-bold text-blue-600">
                  {currentSet.p1Score}
                </div>
                <div className="text-gray-400">-</div>
                <div className="text-2xl font-bold text-red-600">
                  {currentSet.p2Score}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                點擊「+ 得分」立即更新分數
              </div>
            </div>
          )}

          {/* 單局制：顯示目標分數 */}
          {!isCumulative && (
            <div className="text-center mb-3">
              <div className="text-sm md:text-base font-semibold text-gray-700 mb-1">
                本局目標：{targetScore} 分
              </div>
              <div className="text-xs text-gray-500">
                點擊「+ 得分」立即更新，觀眾即時可見
              </div>
            </div>
          )}

          {/* 結束本局按鈕 */}
          <button
            onClick={handleEndCurrentSet}
            disabled={saving}
            className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-base shadow-lg transition-all"
          >
            {saving
              ? "處理中..."
              : isCumulative
              ? `結束${currentSetName}，記錄分數`
              : "結束本局，進入下一局"}
          </button>
          <div className="text-xs text-center text-gray-500 mt-2">
            {isCumulative
              ? "記錄本局分數後，累計總分會更新"
              : "確認本局結束後，獲勝局數會更新"}
          </div>
        </div>

        {/* 選手 2 - 紅方 */}
        <div className="bg-red-50 p-4 border-t-4 border-red-600">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
            🔴 {match.player2.name}
          </h2>
          {currentSet && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-2 min-w-[100px]">
                <button
                  onClick={() => handleScore(2, 1)}
                  className="px-4 md:px-6 py-3 md:py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg md:text-2xl font-bold shadow-lg active:scale-95 transition-transform"
                >
                  + 得分
                </button>
                <button
                  onClick={() => handleScore(2, -1)}
                  disabled={currentSet.p2Score === 0}
                  className="px-4 md:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ↶ 撤銷
                </button>
              </div>
              <div className="text-5xl md:text-7xl font-bold text-red-600 flex-1 text-center">
                {currentSet.p2Score}
              </div>
            </div>
          )}
        </div>

        {/* 結束比賽按鈕 */}
        <div className="p-4 bg-white border-t-2 border-gray-200">
          <button
            onClick={handleEndMatch}
            disabled={!matchComplete || saving}
            className="w-full px-4 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg md:text-xl shadow-lg transition-all"
          >
            {saving
              ? "處理中..."
              : matchComplete
              ? "結束比賽並確認勝者"
              : "尚未達到獲勝條件"}
          </button>
          {!matchComplete && (
            <p className="text-xs text-center text-gray-500 mt-2">
              {isCumulative
                ? `需要打完 ${rule?.totalSets} 局並分出總分勝負`
                : `需要先達到 ${rule?.setsToWin} 局勝利才能結束比賽`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
