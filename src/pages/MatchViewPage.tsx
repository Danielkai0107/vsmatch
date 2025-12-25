import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getSportById, getFormatById } from "../config/sportsData";
import {
  getSetsWon,
  formatScore,
  getCumulativeScore,
  isInOvertime,
  getCurrentSetName,
} from "../utils/scoringLogic";
import { getMatchRoundName } from "../utils/bracketLogic";
import type { Match, Tournament } from "../types";
import { getSetsFormatLabel } from "../types";
import "./MatchViewPage.scss";

export function MatchViewPage() {
  const { tournamentId, matchId } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  // 載入比賽和場次資料（即時監聽）
  useEffect(() => {
    if (!tournamentId || !matchId) return;

    // 載入比賽資料
    const loadTournament = async () => {
      const tournamentSnap = await getDoc(doc(db, "tournaments", tournamentId));
      if (tournamentSnap.exists()) {
        setTournament(tournamentSnap.data() as Tournament);
      }
    };

    loadTournament();

    // 即時監聽場次資料
    const unsubscribe = onSnapshot(
      doc(db, "tournaments", tournamentId, "matches", matchId),
      (matchSnap) => {
        if (matchSnap.exists()) {
          const matchData = matchSnap.data() as Match;
          setMatch(matchData);
          setLoading(false);
        } else {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching match:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tournamentId, matchId]);

  if (loading) {
    return (
      <div className="match-view-loading">
        <div className="spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  // 比賽還在籌備階段
  if (tournament && tournament.status === "draft") {
    return (
      <div className="match-view-waiting">
        <Link to={`/tournament/${tournamentId}`} className="back-link">
          ← 返回對戰表
        </Link>
        <div className="waiting-content">
          <div className="waiting-icon">⏳</div>
          <h2>比賽籌備中，即將開始</h2>
          <p>主辦人需要先點擊「開始比賽」按鈕</p>
        </div>
      </div>
    );
  }

  if (!match || !tournament || !match.player1 || !match.player2) {
    return (
      <div className="match-view-error">
        <Link to={`/tournament/${tournamentId}`} className="back-link">
          ← 返回對戰表
        </Link>
        <p>找不到比賽資料</p>
      </div>
    );
  }

  const sport = getSportById(tournament.config.sportId);
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

  return (
    <div className="match-view">
      <Link to={`/tournament/${tournamentId}`} className="match-view__back">
        ← 返回對戰表
      </Link>

      {/* 比賽資訊 */}
      <div className="match-view__header">
        <h1 className="match-view__tournament">{tournament.name}</h1>
        <h2 className="match-view__round">{roundName}</h2>
        {match.status === "live" && (
          <div className="match-view__status match-view__status--live">
            🔴 進行中
          </div>
        )}
        {match.status === "completed" && (
          <div className="match-view__status match-view__status--completed">
            ✓ 已完成
          </div>
        )}
      </div>

      {/* 累計制進度條 */}
      {isCumulative && rule && match.status !== "pending" && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 font-medium">比賽進度</span>
            <span className="text-sm font-bold text-gray-700">
              {match.currentSet + (match.status === "completed" ? 1 : 0)}/
              {rule.totalSets}局{isOvertimeMode && " + 延長賽"}
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: rule.totalSets }).map((_, index) => (
              <div
                key={index}
                className={`h-3 flex-1 rounded-full transition-all ${
                  index < match.currentSet
                    ? "bg-green-500"
                    : index === match.currentSet && match.status === "live"
                    ? "bg-yellow-400 animate-pulse"
                    : index === match.currentSet && match.status === "completed"
                    ? "bg-green-500"
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
                  className={`h-3 w-10 rounded-full ${
                    index < match.currentSet - rule.totalSets
                      ? "bg-orange-500"
                      : "bg-orange-400 animate-pulse"
                  }`}
                />
              ))}
          </div>
        </div>
      )}

      {/* 計分板 */}
      <div className="scoreboard">
        {/* 選手 1 */}
        <div className="scoreboard__player scoreboard__player--blue">
          <div className="scoreboard__name">{match.player1.name}</div>
          <div className="scoreboard__sets-won">
            {isCumulative ? cumulativeScore?.p1 || 0 : setsWon.p1}
          </div>
          {currentSet && match.status === "live" && (
            <div className="scoreboard__current-score">
              {currentSet.p1Score}
            </div>
          )}
          {match.status === "completed" &&
            match.winner === match.player1.name && (
              <div className="scoreboard__winner-badge">🏆 勝者</div>
            )}
        </div>

        {/* 分隔線 */}
        <div className="scoreboard__divider">
          <div className="scoreboard__vs">VS</div>
          {match.status === "live" && currentSet && (
            <div className="scoreboard__set-info">
              {currentSetName}
              {isOvertimeMode && (
                <div className="text-xs text-orange-600">延長賽</div>
              )}
            </div>
          )}
        </div>

        {/* 選手 2 */}
        <div className="scoreboard__player scoreboard__player--red">
          <div className="scoreboard__name">{match.player2.name}</div>
          <div className="scoreboard__sets-won">
            {isCumulative ? cumulativeScore?.p2 || 0 : setsWon.p2}
          </div>
          {currentSet && match.status === "live" && (
            <div className="scoreboard__current-score">
              {currentSet.p2Score}
            </div>
          )}
          {match.status === "completed" &&
            match.winner === match.player2.name && (
              <div className="scoreboard__winner-badge">🏆 勝者</div>
            )}
        </div>
      </div>

      {/* 比賽歷史 */}
      {match.sets.length > 0 && (
        <div className="match-view__history">
          <h3>比分歷史</h3>
          {isCumulative ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {match.sets.map((set, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg p-3 shadow-sm border-2 ${
                    index === match.currentSet && match.status === "live"
                      ? "border-yellow-400"
                      : "border-gray-200"
                  }`}
                >
                  <div className="text-xs text-gray-500 text-center mb-1">
                    {index < rule.totalSets
                      ? `第${index + 1}局`
                      : `延長${index - rule.totalSets + 1}`}
                  </div>
                  <div className="text-lg font-bold text-center">
                    <span className="text-blue-600">{set.p1Score}</span>
                    <span className="text-gray-400 mx-2">-</span>
                    <span className="text-red-600">{set.p2Score}</span>
                  </div>
                  {index === match.currentSet && match.status === "live" && (
                    <div className="text-xs text-yellow-600 text-center mt-1">
                      進行中
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="match-view__history-score">
              {formatScore(match.sets)}
            </div>
          )}
        </div>
      )}

      {/* 比賽規則 */}
      <div className="match-view__rules">
        <div className="rule-item">
          <span className="rule-label">運動項目：</span>
          <span className="rule-value">{sport?.name}</span>
        </div>
        {!isCumulative && rule?.scoreToWin && rule.scoreToWin > 0 && (
          <div className="rule-item">
            <span className="rule-label">分數：</span>
            <span className="rule-value">{rule.scoreToWin}分制</span>
          </div>
        )}
        <div className="rule-item">
          <span className="rule-label">賽制：</span>
          <span className="rule-value">
            {rule ? getSetsFormatLabel(rule) : ""}
          </span>
        </div>
        {isCumulative && (
          <div className="rule-item">
            <span className="rule-label">計分：</span>
            <span className="rule-value">累計總分制</span>
          </div>
        )}
      </div>
    </div>
  );
}
