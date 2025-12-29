import { useNavigate } from "react-router-dom";
import type { Match } from "../../types";
import {
  formatSetScore,
  getCumulativeScore,
  getCurrentSetName,
  getSetsWon,
} from "../../utils/scoringLogic";
import { usePermissionStore } from "../../stores/permissionStore";
import { useTournamentStore } from "../../stores/tournamentStore";
import "./MatchCard.scss";

interface MatchCardProps {
  match: Partial<Match>;
  tournamentId: string;
  roundName: string;
}

export function MatchCard({ match, tournamentId, roundName }: MatchCardProps) {
  const navigate = useNavigate();
  const hasScorePermission = usePermissionStore((state) =>
    state.hasScorePermission(tournamentId)
  );
  const currentTournament = useTournamentStore(
    (state) => state.currentTournament
  );

  const rule = currentTournament?.config.rules;
  const isCumulative = rule?.scoringMode === "cumulative";
  const sportId = currentTournament?.config.sportId;

  const getStatusClass = () => {
    // 輪空比賽使用 pending 樣式
    if (isBye) {
      return "match-card--pending";
    }

    switch (match.status) {
      case "live":
        return "match-card--live";
      case "completed":
        return "match-card--completed";
      default:
        return "match-card--pending";
    }
  };

  const handleClick = () => {
    if (!match.matchId) return;

    const isBye = !match.player1 || !match.player2;
    if (isBye) return;
    if (match.status === "completed") return;

    if (hasScorePermission) {
      navigate(`/score/${tournamentId}/${match.matchId}`);
    } else if (match.status === "live") {
      navigate(`/match/${tournamentId}/${match.matchId}`);
    }
  };

  const isBye = !match.player1 || !match.player2;
  const isClickable =
    !isBye &&
    match.status !== "completed" &&
    ((hasScorePermission &&
      (match.status === "pending" || match.status === "live")) ||
      match.status === "live");

  // 渲染標題狀態標籤
  const renderHeaderBadge = () => {
    if (!match.sets || match.sets.length === 0) return null;

    if (match.status === "completed") return "Final";

    if (match.status === "live" && match.currentSet !== undefined) {
      const setNumber = match.currentSet + 1;
      if (isCumulative && sportId === "basketball") {
        return `Q${setNumber}`; // Quarter 1, Quarter 2...
      } else {
        return `G${setNumber}`; // Game 1, Game 2...
      }
    }

    return null;
  };

  // 渲染每一局/節的分數
  const renderSetScores = (playerIndex: 1 | 2) => {
    if (!match.sets || match.sets.length === 0) return null;

    return match.sets.map((set, index) => {
      const score = playerIndex === 1 ? set.p1Score : set.p2Score;
      const opponentScore = playerIndex === 1 ? set.p2Score : set.p1Score;
      const isCurrentSet = index === match.currentSet && match.status === "live";
      const isWonSet = score > opponentScore;
      const isCompletedSet =
        match.status === "completed" ||
        (match.status === "live" && index < (match.currentSet || 0));

      let className = "match-card__set-score";

      if (isCurrentSet) {
        // 正在進行的局：藍色高亮
        className += " match-card__set-score--current";
      } else if (isCompletedSet) {
        // 已完成的局：根據勝負決定顏色
        if (isWonSet) {
          className += " match-card__set-score--won";
        } else {
          className += " match-card__set-score--lost";
        }
      } else {
        // 未來的局（不應該出現，但以防萬一）
        className += " match-card__set-score--empty";
      }

      return (
        <span key={index} className={className}>
          {score}
        </span>
      );
    });
  };

  // 渲染最終總計（局數或總分）
  const renderFinalScore = (playerIndex: 1 | 2) => {
    if (!match.sets || match.sets.length === 0) return <span>-</span>;

    const isWinner =
      match.winner ===
      (playerIndex === 1 ? match.player1?.name : match.player2?.name);

    if (isCumulative) {
      // 總分制：顯示累計總分
      // live 時包含當前節，completed 時包含所有節
      const setsToCount =
        match.status === "completed"
          ? match.sets
          : match.sets.slice(0, (match.currentSet || 0) + 1);
      const total = getCumulativeScore(setsToCount);
      const score = playerIndex === 1 ? total.p1 : total.p2;

      return (
        <span
          className={`match-card__total-score ${
            match.status === "completed" && isWinner
              ? "match-card__total-score--winner"
              : ""
          }`}
        >
          {score}
        </span>
      );
    } else {
      // 單局制：顯示勝局數（排除當前進行中的局）
      const setsWon = getSetsWon(
        match.sets,
        match.status === "live" ? match.currentSet : undefined
      );
      const score = playerIndex === 1 ? setsWon.p1 : setsWon.p2;

      return (
        <span
          className={`match-card__total-score ${
            match.status === "completed" && isWinner
              ? "match-card__total-score--winner"
              : ""
          }`}
        >
          {score}
        </span>
      );
    }
  };

  // 填充空白格子（當局數未滿時）
  const renderEmptySlots = () => {
    if (!match.sets || !rule) return null;

    const currentSetsCount = match.sets.length;
    const totalSets = rule.totalSets;
    const emptySlotsCount = Math.max(0, totalSets - currentSetsCount);

    return Array.from({ length: emptySlotsCount }).map((_, index) => (
      <span key={`empty-${index}`} className="match-card__set-score--empty">
        -
      </span>
    ));
  };

  return (
    <div
      className={`match-card ${getStatusClass()} ${
        isClickable ? "match-card--clickable" : ""
      }`}
      onClick={handleClick}
    >
      {/* 頭部 */}
      <div className="match-card__header">
        <span className="match-card__round">{roundName}</span>
        {match.sets && match.sets.length > 0 && (
          <span className="match-card__period">{renderHeaderBadge()}</span>
        )}
        {match.status === "pending" && (
          <span className="match-card__status match-card__status--pending">
            未開始
          </span>
        )}
        {match.status === "live" && (
          <span className="match-card__status match-card__status--live">
            進行中
          </span>
        )}
        {match.status === "completed" && isBye && (
          <span className="match-card__status match-card__status--pending">
            輪空
          </span>
        )}
        {match.status === "completed" && !isBye && (
          <span className="match-card__status match-card__status--completed">
            已完成
          </span>
        )}
        {hasScorePermission &&
          (match.status === "pending" || match.status === "live") &&
          !isBye && (
            <span className="match-card__clickable-hint">點擊計分</span>
          )}
      </div>

      {/* 比分區域 - 統一格式 */}
      <div className="match-card__scores">
        {/* 選手 1 */}
        <div className="match-card__player-row">
          <div
            className={`match-card__player-name ${
              match.winner === match.player1?.name
                ? "match-card__player-name--winner"
                : !match.player1?.name
                ? "match-card__player-name--pending"
                : ""
            }`}
          >
            {match.player1?.name || "待定"}
          </div>
          <div className="match-card__player-sets">
            {match.sets && match.sets.length > 0 ? (
              <>
                {renderSetScores(1)}
                {match.status !== "completed" && renderEmptySlots()}
              </>
            ) : (
              // 未開始時也顯示空白格子
              rule && Array.from({ length: rule.totalSets }).map((_, index) => (
                <span key={`empty-${index}`} className="match-card__set-score--empty">
                  -
                </span>
              ))
            )}
          </div>
          <div className="match-card__player-total">
            {renderFinalScore(1)}
          </div>
        </div>

        {/* 選手 2 */}
        <div className="match-card__player-row">
          <div
            className={`match-card__player-name ${
              match.winner === match.player2?.name
                ? "match-card__player-name--winner"
                : !match.player2?.name
                ? "match-card__player-name--pending"
                : ""
            }`}
          >
            {match.player2?.name || "待定"}
          </div>
          <div className="match-card__player-sets">
            {match.sets && match.sets.length > 0 ? (
              <>
                {renderSetScores(2)}
                {match.status !== "completed" && renderEmptySlots()}
              </>
            ) : (
              // 未開始時也顯示空白格子
              rule && Array.from({ length: rule.totalSets }).map((_, index) => (
                <span key={`empty-${index}`} className="match-card__set-score--empty">
                  -
                </span>
              ))
            )}
          </div>
          <div className="match-card__player-total">
            {renderFinalScore(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
